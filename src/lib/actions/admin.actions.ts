'use server';

import { adminFirestore } from '@/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { Article } from '@/lib/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { initialCategories } from '@/seed-data/categories';
import { articlesToSeed } from '@/seed-data/articles';
import { verifyAdmin } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

// Helper functions for cleanup
async function deleteAllFromCollection(collectionPath: string) {
    const collectionRef = adminFirestore.collection(collectionPath);
    const snapshot = await collectionRef.get();
    if (snapshot.empty) return;
    const batch = adminFirestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
}

async function deleteAllFromCollectionGroup(collectionGroup: string) {
    const groupRef = adminFirestore.collectionGroup(collectionGroup);
    const snapshot = await groupRef.get();
    if (snapshot.empty) return;
    const batch = adminFirestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
}

async function deleteAllStorageFiles(prefix: string) {
    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles({ prefix });
    if (files.length === 0) return;
    await Promise.all(files.map(file => file.delete()));
}

// FINAL, CORRECTED VERSION FOR NEW onDocumentCreated TRIGGER
export async function seedDatabaseAction(authToken: string): Promise<{ success: boolean; message: string }> {
    const { isAdmin, decodedToken, error } = await verifyAdmin(authToken);
    if (!isAdmin || !decodedToken) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    const authorId = decodedToken.uid;
    const firestore = adminFirestore;
    const bucket = getStorage().bucket();

    try {
        console.log('STARTING DATABASE SEEDING PROCESS...');

        // Step 1: Clean up existing data
        await Promise.all([
            deleteAllFromCollection('articles'),
            deleteAllFromCollectionGroup('comments'),
            deleteAllFromCollection('categories'),
            deleteAllFromCollection('images'),
            deleteAllStorageFiles('images/'),
        ]);
        console.log('Cleanup complete.');

        // Step 2: Seed Categories
        const categoryBatch = firestore.batch();
        const categoryMap = new Map<string, { name: string; slug: string }>();
        initialCategories.forEach(category => {
            const categoryRef = firestore.collection('categories').doc(category.id);
            const categoryWithCount = { ...category, articleCount: 0 };
            categoryBatch.set(categoryRef, categoryWithCount);
            categoryMap.set(category.id, { name: category.name, slug: category.slug });
        });
        await categoryBatch.commit();
        console.log('Categories seeded.');

        // Step 3: Get Author Info
        const authorRef = firestore.collection('users').doc(authorId);
        const authorSnap = await authorRef.get();
        const authorName = authorSnap.data()?.displayName || 'Unknown Author';

        // Step 4: Create articles and associated image data sequentially
        console.log('Creating articles and image documents sequentially...');
        
        for (const articleSeed of articlesToSeed) {
            const articleRef = firestore.collection('articles').doc();
            const imageRef = firestore.collection('images').doc(); 
            const imageId = imageRef.id;

            const localImagePath = path.join(process.cwd(), 'src', 'seed-data', articleSeed.imageFolderName, articleSeed.imageFileName);
            const tempStoragePath = `images/temp/${authorId}/${imageId}/${articleSeed.imageFileName}`;

            // First, upload the image file to the temporary location
            const imageBuffer = await fs.readFile(localImagePath);
            await bucket.file(tempStoragePath).save(imageBuffer, {
                 metadata: {
                    metadata: { // Note the nested 'metadata' object
                        userId: authorId,
                        imageId: imageId,
                        isTemp: 'true'
                    },
                },
            });
            console.log(`Uploaded temp image to: ${tempStoragePath}`);

            // Second, create the complete and correct image document in Firestore
            await imageRef.set({
                userId: authorId,
                articleId: articleRef.id,
                imageId: imageId,
                tempPath: tempStoragePath, // CRITICAL: Include the tempPath
                originalFilename: articleSeed.imageFileName, // CRITICAL: Include the filename
                createdAt: new Date(),
                processingComplete: false,
                isFeatureImage: true,
                imageHint: articleSeed.imageHint, // Keep the hint
            });
            console.log(`Created image document for imageId: ${imageId}`);

            // Third, create the article document. This will trigger the cloud function.
            const categoryInfo = categoryMap.get(articleSeed.categoryId) || { name: 'Uncategorized', slug: 'uncategorized' };
            const newArticle: Omit<Article, 'image'> & { image: { id: string, imageHint: string } } = {
                id: articleRef.id,
                slug: articleSeed.slug,
                title: articleSeed.title,
                description: articleSeed.description,
                content: articleSeed.content,
                authorId: authorId,
                authorName: authorName,
                categoryId: articleSeed.categoryId,
                categoryName: categoryInfo.name,
                categorySlug: categoryInfo.slug,
                date: new Date().toISOString(),
                views: 0,
                image: { id: imageId, imageHint: articleSeed.imageHint },
            };
            
            const categoryRef = firestore.collection('categories').doc(articleSeed.categoryId);
            const articleBatch = firestore.batch();
            articleBatch.set(articleRef, newArticle);
            articleBatch.update(categoryRef, { articleCount: FieldValue.increment(1) });
            await articleBatch.commit();

            console.log(`Created article: ${newArticle.slug}. The 'processArticleImagesOnCreate' function will now run.`);
        }

        console.log('DATABASE SEEDING PROCESS COMPLETED SUCCESSFULLY!');
        return { success: true, message: 'Database seed completed! The image processing function has been triggered for all articles.' };

    } catch (e: any) {
        console.error("DATABASE SEEDING FAILED:", e);
        return {
            success: false,
            message: `Failed to seed database: ${e.message}`,
        };
    }
}
