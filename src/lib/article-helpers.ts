'use server';

import { adminFirestore } from '@/firebase/admin';
import { Article, NewArticleData } from '@/lib/types';
import { getStorage } from 'firebase-admin/storage';
import { getHighlightedHtml } from './actions/admin.actions';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Polls for the image document to appear and for the 'processingComplete' flag to be true.
 */
async function pollForImageProcessing(imageId: string, timeout = 300000): Promise<any> {
    const imageRef = adminFirestore.collection('images').doc(imageId);
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const imageSnap = await imageRef.get();
        if (imageSnap.exists) {
            const imageData = imageSnap.data();
            if (imageData?.processingComplete) {
                console.log(`Image processing complete for ${imageId}.`);
                return imageData;
            }
        }
        // Wait for a second before polling again.
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Image processing for ${imageId} did not complete within the timeout period.`);
}

/**
 * Moves an image file from a temporary path to a permanent path in Firebase Storage.
 */
async function moveImageToPermanentStorage(tempPath: string, permanentPath: string) {
    const bucket = getStorage().bucket();
    const file = bucket.file(tempPath);
    const [exists] = await file.exists();
    if (exists) {
        await file.move(permanentPath);
        console.log(`Moved ${tempPath} to ${permanentPath}`);
    } else {
        console.warn(`File at temp path ${tempPath} not found, skipping move.`);
    }
}

/**
 * Creates a long-lived signed URL for a file in Firebase Storage.
 */
async function getPermanentSignedUrl(filePath: string): Promise<string> {
    const bucket = getStorage().bucket();
    const [url] = await bucket.file(filePath).getSignedUrl({
        action: 'read',
        expires: '03-09-2491' // A very long time in the future
    });
    return url;
}

export async function processAndCreateArticle(
    authorId: string,
    articleData: NewArticleData
): Promise<{ success: boolean; message: string; slug?: string }> {
    const firestore = adminFirestore;

    try {
        const imageId = articleData.image.id;
        if (!imageId) {
            throw new Error('Image ID is missing from article data.');
        }

        const tempImageDoc = await pollForImageProcessing(imageId);

        const permanentImagePaths: { [key: string]: string } = {};
        const permanentImageUrls: { [key: string]: string } = {};

        const tempOriginalPath = tempImageDoc.originalPath;
        const permanentOriginalPath = tempOriginalPath.replace('images/temp/', 'images/');
        await moveImageToPermanentStorage(tempOriginalPath, permanentOriginalPath);
        permanentImagePaths['original'] = permanentOriginalPath;
        permanentImageUrls['originalUrl'] = await getPermanentSignedUrl(permanentOriginalPath);

        if (tempImageDoc.resizedPaths) {
            for (const [size, tempPath] of Object.entries(tempImageDoc.resizedPaths)) {
                const permanentPath = (tempPath as string).replace('images/temp/', 'images/');
                await moveImageToPermanentStorage(tempPath as string, permanentPath);
                permanentImagePaths[size] = permanentPath;
                permanentImageUrls[`${size}Url`] = await getPermanentSignedUrl(permanentPath);
            }
        }
        
        const finalContent = await getHighlightedHtml(articleData.content);

        const authorRef = firestore.collection('users').doc(authorId);
        const articleRef = firestore.collection('articles').doc();
        const imageRef = firestore.collection('images').doc(imageId);

        await firestore.runTransaction(async (transaction) => {
            const authorDoc = await transaction.get(authorRef);
            if (!authorDoc.exists) {
                throw new Error('Author not found');
            }
            const authorName = authorDoc.data()?.displayName || 'Unknown Author';

            const newArticle: Article = {
                id: articleRef.id,
                slug: articleData.slug,
                title: articleData.title,
                description: articleData.description,
                content: finalContent,
                authorId: authorId,
                authorName: authorName,
                category: articleData.category,
                date: new Date().toISOString(),
                views: 0,
                image: {
                    id: imageId,
                    imageHint: articleData.image.imageHint,
                    imageUrl: permanentImageUrls.originalUrl,
                    ...(permanentImageUrls.thumbUrl && { thumbUrl: permanentImageUrls.thumbUrl }),
                    ...(permanentImageUrls.mediumUrl && { mediumUrl: permanentImageUrls.mediumUrl }),
                    ...(permanentImageUrls.largeUrl && { largeUrl: permanentImageUrls.largeUrl }),
                },
            };
            transaction.set(articleRef, newArticle);

            transaction.update(imageRef, {
                permanentPaths: permanentImagePaths,
                permanentUrls: permanentImageUrls,
                articleId: articleRef.id,
                tempPaths: FieldValue.delete(),
                resizedPaths: FieldValue.delete(),
                processingComplete: FieldValue.delete(),
            });
        });

        console.log(`Successfully created article ${articleRef.id} and updated image ${imageId}`);
        return {
            success: true,
            message: 'Article created successfully!',
            slug: articleData.slug,
        };
    } catch (error: any) {
        console.error('Error in processAndCreateArticle:', error);
        return { success: false, message: `Failed to create article: ${error.message}` };
    }
}

export async function deleteArticleAndAssociatedImage(
    articleId: string,
    requestingUid: string
): Promise<{ success: boolean; message: string }> {
    const firestore = adminFirestore;
    const bucket = getStorage().bucket();
    const articleRef = firestore.collection('articles').doc(articleId);
    const userRef = firestore.collection('users').doc(requestingUid);

    try {
        // First, delete all comments in the article's comments subcollection
        const commentsRef = articleRef.collection('comments');
        const commentsSnapshot = await commentsRef.get();
        if (!commentsSnapshot.empty) {
            const batch = firestore.batch();
            commentsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Deleted ${commentsSnapshot.size} comments for article ${articleId}`);
        }

        await firestore.runTransaction(async (transaction) => {
            const articleSnap = await transaction.get(articleRef);
            if (!articleSnap.exists) {
                throw new Error('Article not found.');
            }

            const articleData = articleSnap.data() as Article;
            const authorId = articleData.authorId;

            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists) {
                throw new Error('Requesting user not found.');
            }
            const userData = userSnap.data();
            const userRoles = userData?.roles || [];
            const isAdmin = userRoles.includes('admin');

            if (authorId !== requestingUid && !isAdmin) {
                throw new Error('You are not authorized to delete this article.');
            }

            const imageId = articleData.image?.id;

            transaction.delete(articleRef);

            if (imageId) {
                const imageRef = firestore.collection('images').doc(imageId);
                const imageSnap = await transaction.get(imageRef);
                if (imageSnap.exists) {
                    const imageData = imageSnap.data();

                    if (imageData?.permanentPaths) {
                        for (const path of Object.values(imageData.permanentPaths)) {
                            if (path) {
                                await bucket.file(path as string).delete().catch(err => console.error(`Failed to delete storage file ${path}:`, err));
                            }
                        }
                    }
                    if (imageData?.tempPaths) {
                        for (const path of Object.values(imageData.tempPaths)) {
                             if (path) {
                                await bucket.file(path as string).delete().catch(err => console.error(`Failed to delete temp storage file ${path}:`, err));
                            }
                        }
                    }

                    transaction.delete(imageRef);
                }
            }
        });

        return { success: true, message: 'Article and associated images deleted successfully.' };
    } catch (error: any) {
        console.error('Error in deleteArticleAndAssociatedImage:', error);
        if (error.message === 'You are not authorized to delete this article.') {
            return { success: false, message: error.message };
        }
        return { success: false, message: `Failed to delete article: ${error.message}` };
    }
}
