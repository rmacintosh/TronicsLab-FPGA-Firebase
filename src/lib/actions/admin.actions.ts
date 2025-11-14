'use server';

import { adminFirestore } from '@/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { JSDOM } from 'jsdom';
import { bundledLanguages, createHighlighter, Highlighter } from 'shiki';
import { processAndCreateArticle } from '@/lib/article-helpers';
import { NewArticleData } from '@/lib/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { initialCategories } from '@/seed-data/categories';
import { articlesToSeed } from '@/seed-data/articles';
import { verifyAdmin } from '@/lib/auth-utils'; // CORRECT: Import from the new utility file

// Highlighter setup remains the same...
const highlighterPromise: Promise<Highlighter> = createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: Object.keys(bundledLanguages),
});

// getHighlightedHtml function remains the same...
export async function getHighlightedHtml(html: string): Promise<string> {
    const dom = new JSDOM(html);
    const { document } = dom.window;
    const codeBlocks = document.querySelectorAll('pre > code');
    const highlighter = await highlighterPromise;

    for (const codeBlock of codeBlocks) {
        const preElement = codeBlock.parentElement as HTMLPreElement;
        const lang = codeBlock.className.replace('language-', '');
        const code = codeBlock.textContent || '';
        try {
            const highlightedCode = highlighter.codeToHtml(code, {
                lang,
                themes: { light: 'github-light', dark: 'github-dark' },
            });
            preElement.outerHTML = highlightedCode;
        } catch (e) {
            console.error(`Shiki highlighting failed for lang: '${lang}'`, e);
        }
    }
    return document.body.innerHTML;
}

// deleteAllDocuments and deleteAllStorageFiles functions remain the same...
async function deleteAllDocuments(collectionPath: string) {
    const collectionRef = adminFirestore.collection(collectionPath);
    const snapshot = await collectionRef.get();
    if (snapshot.empty) return;
    const batch = adminFirestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`All documents in '${collectionPath}' have been deleted.`);
}

async function deleteAllStorageFiles(prefix: string) {
    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles({ prefix });
    if (files.length === 0) return;
    await Promise.all(files.map(file => file.delete()));
    console.log(`All files with prefix '${prefix}' have been deleted from storage.`);
}

// REMOVED: The duplicated verifyAdmin function is no longer here.

export async function seedDatabaseAction(authToken: string): Promise<{ success: boolean; message: string }> {
    // CORRECT: Use the imported verifyAdmin function
    const { isAdmin, decodedToken, error } = await verifyAdmin(authToken);
    if (!isAdmin || !decodedToken) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    try {
        const authorId = decodedToken.uid;

        console.log('STARTING DATABASE SEEDING PROCESS...');

        // ... (rest of the seeding logic is unchanged)
        console.log('Step 1: Clearing all existing articles, categories, and image data...');
        await Promise.all([
            deleteAllDocuments('articles'),
            deleteAllDocuments('categories'),
            deleteAllDocuments('images'),
            deleteAllStorageFiles('images/'),
        ]);
        console.log('Step 1: Cleanup complete.');

        console.log('Step 2: Seeding categories...');
        const categoryBatch = adminFirestore.batch();
        initialCategories.forEach(category => {
            const categoryRef = adminFirestore.collection('categories').doc(category.id);
            categoryBatch.set(categoryRef, category);
        });
        await categoryBatch.commit();
        console.log('Step 2: Categories seeded.');

        console.log('Step 3: Preparing articles and uploading initial images...');
        const articleDataForCreation = await Promise.all(articlesToSeed.map(async (articleSeed) => {
            const imageRef = adminFirestore.collection('images').doc();
            const imageId = imageRef.id;
            const tempStoragePath = `images/temp/${authorId}/${imageId}/${articleSeed.imageFileName}`;
            const localImagePath = path.join(process.cwd(), 'src', 'seed-data', articleSeed.imageFolderName, articleSeed.imageFileName);

            try {
                const imageBuffer = await fs.readFile(localImagePath);
                await getStorage().bucket().file(tempStoragePath).save(imageBuffer);
            } catch (error) {
                throw new Error(`Failed to read or upload seed image: ${localImagePath}. Make sure it exists.`);
            }
            
            const highlightedContent = await getHighlightedHtml(articleSeed.content);

            const data: NewArticleData = {
                slug: articleSeed.slug,
                title: articleSeed.title,
                description: articleSeed.description,
                categoryId: articleSeed.categoryId,
                content: highlightedContent,
                image: { id: imageId, imageHint: articleSeed.imageHint, imageUrl: '' },
            };
            return data;
        }));
        console.log('Step 3: Article data prepared and images uploaded to temp directory.');

        console.log('Step 4: Waiting for image processing and creating articles...');
        const creationPromises = articleDataForCreation.map(data => processAndCreateArticle(authorId, data));
        const creationResults = await Promise.all(creationPromises);

        const failedCreations = creationResults.filter(r => !r.success);
        if (failedCreations.length > 0) {
            const errorDetails = failedCreations.map(f => `${f.slug}: ${f.message}`).join('\n');
            throw new Error(`One or more articles failed during final creation step:\n${errorDetails}`);
        }
        console.log('Step 4: All articles created successfully.');

        console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
        return { success: true, message: 'Database seeded successfully!' };

    } catch (error: any) {
        console.error("DATABASE SEEDING FAILED:", error);
        return {
            success: false,
            message: `Failed to seed database: ${error.message}`,
        };
    }
}
