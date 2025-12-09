'use server';

import { adminFirestore } from '@/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

// CORRECTED to securely check for admin custom claim inside the function.
export async function deleteArticleAndAssociatedImage(
    articleId: string,
    requestingUid: string
): Promise<{ success: boolean; message: string }> {
    const firestore = adminFirestore;
    const bucket = getStorage().bucket();
    const articleRef = firestore.collection('articles').doc(articleId);

    try {
        // Step 1: Fetch the article and authorize the user
        const articleSnap = await articleRef.get();
        if (!articleSnap.exists) {
            throw new Error('Article not found.');
        }
        const articleData = articleSnap.data()!;
        const authorId = articleData.authorId;

        // Securely check for admin custom claim using the Admin SDK
        const user = await getAuth().getUser(requestingUid);
        const isAdmin = user.customClaims?.admin === true;

        // Authorize if user is the author OR is an admin
        if (!isAdmin && authorId !== requestingUid) {
            throw new Error('You are not authorized to delete this article.');
        }

        // Step 2: Gather all associated images and comments for the article
        const imagesQuery = firestore.collection('images').where('articleId', '==', articleId);
        const imagesSnapshot = await imagesQuery.get();
        
        const commentsQuery = firestore.collection('comments').where('articleId', '==', articleId);
        const commentsSnapshot = await commentsQuery.get();

        // Step 3: Collect all Cloud Storage file paths from all associated images
        const pathsToDelete: string[] = [];
        imagesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.permanentPaths) {
                Object.values(data.permanentPaths).forEach(path => {
                    if (typeof path === 'string') pathsToDelete.push(path);
                });
            }
            if (data.tempPath && typeof data.tempPath === 'string') {
                pathsToDelete.push(data.tempPath);
            }
        });

        // Step 4: Perform all database deletions in a single atomic batch write
        const batch = firestore.batch();

        imagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        commentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        batch.delete(articleRef);

        if (articleData.categoryId) {
            const categoryRef = firestore.collection('categories').doc(articleData.categoryId);
            batch.update(categoryRef, { articleCount: FieldValue.increment(-1) });
        }
        
        await batch.commit();
        console.log(`DB Cleanup: Deleted article ${articleId}, ${imagesSnapshot.size} image docs, and ${commentsSnapshot.size} comment docs.`);

        // Step 5: Asynchronously delete all associated files from Cloud Storage
        if (pathsToDelete.length > 0) {
            const deletePromises = pathsToDelete.map(path => 
                bucket.file(path).delete().catch(err => 
                    console.error(`(Non-fatal) Failed to delete storage file ${path}:`, err)
                )
            );
            await Promise.all(deletePromises);
            console.log(`Storage Cleanup: Deleted ${pathsToDelete.length} associated files from Cloud Storage.`);
        }

        return { success: true, message: 'Article and all associated images/comments deleted successfully.' };

    } catch (error: any) {
        console.error('Error in deleteArticleAndAssociatedImage:', error);
        return { success: false, message: `Failed to delete article: ${error.message}` };
    }
}
