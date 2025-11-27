'use server';

import { adminFirestore } from '@/firebase/admin';
import { Article } from './server-types';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue } from 'firebase-admin/firestore';

export async function deleteArticleAndAssociatedImage(
    articleId: string,
    requestingUid: string
): Promise<{ success: boolean; message: string }> {
    const firestore = adminFirestore;
    const bucket = getStorage().bucket();
    const articleRef = firestore.collection('articles').doc(articleId);
    const userRef = firestore.collection('users').doc(requestingUid);

    try {
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
            const { authorId, categoryId, image } = articleData;

            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists) {
                throw new Error('Requesting user not found.');
            }
            const userData = userSnap.data();
            const userRoles = userData?.roles || [];
            const isAdmin = userRoles.includes('admin');

            const imageId = image?.id;
            const imageRef = imageId ? firestore.collection('images').doc(imageId) : null;
            const imageSnap = imageRef ? await transaction.get(imageRef) : null;
            const imageData = imageSnap?.exists ? imageSnap.data() : null;

            const isArticleAuthor = authorId === requestingUid;
            const isImageOwner = imageData?.userId === requestingUid;

            if (!isAdmin && !(image ? isImageOwner : isArticleAuthor)) {
                throw new Error('You are not authorized to delete this article.');
            }

            transaction.delete(articleRef);

            if (categoryId) {
                const categoryRef = firestore.collection('categories').doc(categoryId);
                transaction.update(categoryRef, { 
                    articleCount: FieldValue.increment(-1) 
                });
            }

            if (imageId && imageSnap?.exists && imageRef) {
                if (imageData?.permanentPaths) {
                    for (const path of Object.values(imageData.permanentPaths)) {
                        if (path) {
                            await bucket.file(path as string).delete().catch(err => console.error(`Failed to delete storage file ${path}:`, err));
                        }
                    }
                }
                if (imageData?.tempPaths) { // Should be cleaned up but good to have
                    for (const path of Object.values(imageData.tempPaths)) {
                         if (path) {
                            await bucket.file(path as string).delete().catch(err => console.error(`Failed to delete temp storage file ${path}:`, err));
                        }
                    }
                }
                transaction.delete(imageRef);
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
