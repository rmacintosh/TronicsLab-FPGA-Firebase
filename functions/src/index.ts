
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import sharp from "sharp";
import { defineString } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { Category } from "./server-types";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();
const storage = getStorage();

const THUMB_WIDTH = 200;
const MEDIUM_WIDTH = 1024;
const LARGE_WIDTH = 1920;

const storageBucket = defineString("GCLOUD_STORAGE_BUCKET");

async function getPermanentSignedUrl(filePath: string, bucketName: string): Promise<string> {
    const options = { action: 'read' as const, expires: '03-09-2491' };
    const [url] = await storage.bucket(bucketName).file(filePath).getSignedUrl(options);
    return url;
}


export const processNewImage = onDocumentCreated(
    { 
        document: "images/{imageId}", 
        memory: "1GiB", 
        invoker: "public",
        retry: true // Enable retries on failure
    },
    async (event) => {
        const imageId = event.params.imageId;
        const imageData = event.data?.data();

        if (!imageData || !event.data) {
            logger.log(`Image data for ${imageId} is missing. Exiting.`);
            return;
        }

        if (imageData.processingComplete) {
            logger.log(`Image ${imageId} is already marked as complete. Exiting.`);
            return;
        }

        const { articleId, tempPath, originalFilename, isFeatureImage, userId } = imageData;

        if (!articleId || !tempPath || !originalFilename || !userId) {
            logger.error(`Image ${imageId} is missing critical data. Will not retry.`, { data: imageData });
            await event.data.ref.update({ processingError: "Missing critical data for processing." });
            return; 
        }
        
        const bucket = storage.bucket(storageBucket.value());
        const articleRef = db.collection("articles").doc(articleId);
        let tempLocalPath = ""; // Declare here to be accessible in finally

        try {
            // PRE-FLIGHT CHECK 1: Ensure the article document exists.
            const articleDoc = await articleRef.get();
            if (!articleDoc.exists) {
                throw new HttpsError('unavailable', `Article document ${articleId} not found. Retrying.`);
            }
            const articleData = articleDoc.data()!;

            // PRE-FLIGHT CHECK 2: For content images, ensure the temp URL is in the article body.
            if (!isFeatureImage) {
                const urlToFind = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(tempPath)}`;
                if (!articleData.content || !articleData.content.includes(urlToFind)) {
                     throw new HttpsError('unavailable', `Temp content URL not yet found in article ${articleId}. Retrying.`);
                }
            }

            // Start main processing
            const tempFile = bucket.file(tempPath);
            tempLocalPath = path.join(os.tmpdir(), `${event.id}-${originalFilename}`); // Assign here
            await tempFile.download({ destination: tempLocalPath });

            const updatePayload: { [key: string]: any } = {};

            if (isFeatureImage) {
                logger.log(`Processing FEATURE image ${imageId} for article ${articleId}`);
                const sizes = { thumb: THUMB_WIDTH, medium: MEDIUM_WIDTH, large: LARGE_WIDTH };
                const permanentUrls: { [key: string]: string } = {};
                const permanentPaths: { [key: string]: string } = {};
                const uploadPromises: Promise<void>[] = [];

                for (const [name, width] of Object.entries(sizes)) {
                    const newFileName = `${path.parse(originalFilename).name}_${name}.jpg`;
                    const newFilePath = `images/${userId}/${articleId}/feature/${newFileName}`;
                    permanentPaths[name] = newFilePath;

                    const resizeAndUpload = async () => {
                        const resizedBuffer = await sharp(tempLocalPath).resize({ width }).jpeg().toBuffer();
                        await bucket.file(newFilePath).save(resizedBuffer, { metadata: { contentType: 'image/jpeg' } });
                        permanentUrls[`${name}Url`] = await getPermanentSignedUrl(newFilePath, bucket.name);
                    };
                    uploadPromises.push(resizeAndUpload());
                }

                const originalPermPath = `images/${userId}/${articleId}/feature/${originalFilename}`;
                permanentPaths.original = originalPermPath;

                const moveOriginal = async () => {
                    await tempFile.move(originalPermPath);
                    permanentUrls.originalUrl = await getPermanentSignedUrl(originalPermPath, bucket.name);
                };
                uploadPromises.push(moveOriginal());

                await Promise.all(uploadPromises);
                
                const featureImageUpdatePayload = { ...articleData.image, ...permanentUrls };
                await articleRef.update({ image: featureImageUpdatePayload });
                
                updatePayload.permanentPaths = permanentPaths;
                updatePayload.permanentUrls = permanentUrls;
                logger.log(`Successfully processed and updated article with feature image ${imageId}.`);

            } else { // It's a content image
                logger.log(`Processing CONTENT image ${imageId} for article ${articleId}`);
                const permanentPath = `images/${userId}/${articleId}/content/${imageId}/${originalFilename}`;
                await tempFile.move(permanentPath);
                const permanentUrl = await getPermanentSignedUrl(permanentPath, bucket.name);

                updatePayload.permanentPaths = { original: permanentPath };
                updatePayload.permanentUrls = { originalUrl: permanentUrl };

                const urlToFind = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(tempPath)}`;
                const contentRegex = new RegExp(`(<img[^>]+src=")${urlToFind}[^"]+(")`, 'g');

                const updatedArticleContent = articleData.content.replace(contentRegex, `$1${permanentUrl}$2`);
                await articleRef.update({ content: updatedArticleContent });
                logger.log(`Replaced temp URL for content image ${imageId} in article.`);
            }

            updatePayload.processingComplete = true;
            updatePayload.tempPath = FieldValue.delete();

            await event.data.ref.update(updatePayload);

        } catch (error: any) {
             // Catch retryable errors.
            if (error instanceof HttpsError && error.code === 'unavailable') {
                logger.warn(`A dependent resource was not ready for image ${imageId}. Retrying...`, { message: error.message });
                throw error; // Re-throw to let Cloud Functions handle the retry.
            }
            // Catch the specific storage error for a missing file.
            if (error.code === 404) {
                logger.warn(`File not found for image ${imageId} at path ${tempPath}. This is a timing issue. Retrying function...`, { originalError: error.message });
                throw new HttpsError('unavailable', 'Temporary file not found, will retry.');
            }
             // Catch specific GRPC not-found errors when updating Firestore.
            if (error.code === 5) { // 5 = GRPC NOT_FOUND
                logger.warn(`Firestore document not found during update for image ${imageId}. This is a timing issue. Retrying function...`, { originalError: error.message });
                throw new HttpsError('unavailable', 'Firestore document was not ready, will retry.');
            }

            // For all other errors, log them as permanent and do not retry.
            logger.error(`PERMANENT FAILURE: Failed to process image ${imageId} from path ${tempPath}:`, error);
            await event.data.ref.update({ processingError: (error as Error).message });

        } finally {
            // Clean up the local temp file regardless of outcome.
            if (tempLocalPath && fs.existsSync(tempLocalPath)) {
                fs.unlinkSync(tempLocalPath);
            }
        }
    }
);


// NEW CLEANUP FUNCTION: Triggers on article update to clean up old images.
export const cleanupOnArticleUpdate = onDocumentUpdated(
    { 
        document: "articles/{articleId}", 
        invoker: "public",
        retry: true // Enable retries on failure
    },
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();

        if (!before || !after) {
            logger.log(`Article data missing on update for ${event.params.articleId}. Exiting cleanup.`);
            return;
        }

        // Check if the feature image was replaced
        if (before.image?.id && before.image.id !== after.image?.id) {
            const oldImageId = before.image.id;
            logger.log(`Feature image changed for article ${event.params.articleId}. Cleaning up old image ${oldImageId}.`);

            const imageDocRef = db.collection("images").doc(oldImageId);
            const imageDoc = await imageDocRef.get();

            if (imageDoc.exists) {
                const { permanentPaths } = imageDoc.data()!;
                const bucket = storage.bucket(storageBucket.value());
                
                if (permanentPaths) {
                    const pathsToDelete = Object.values(permanentPaths).filter(p => typeof p === 'string');
                    const deletionPromises = pathsToDelete.map(p => 
                        bucket.file(p as string).delete().catch(e => logger.warn(`Failed to delete old file ${p}: ${e.message}`))
                    );
                    await Promise.all(deletionPromises);
                }

                await imageDocRef.delete();
                logger.log(`Successfully cleaned up old image files and document for ${oldImageId}`);
            } else {
                 logger.log(`Old image document ${oldImageId} not found. Exiting cleanup.`);
            }
        }
    }
);

export const deleteImageSet = onCall({cors: true}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { imageId } = request.data;
    if (!imageId) {
        throw new HttpsError('invalid-argument', "Request must include 'imageId'.");
    }

    const callingUid = request.auth.uid;
    const imageDocRef = db.collection("images").doc(imageId);

    try {
        const imageDoc = await imageDocRef.get();
        if (!imageDoc.exists) {
            logger.warn(`Image document ${imageId} not found for deletion. It might have been already deleted.`);
            return { success: true, message: `Image document ${imageId} not found.` };
        }

        const { userId, permanentPaths, tempPath } = imageDoc.data()!;

        if (userId !== callingUid) {
            const adminUserSnap = await db.collection('users').doc(callingUid).get();
            if (!adminUserSnap.exists || !adminUserSnap.data()?.roles?.includes('admin')) {
                 throw new HttpsError('permission-denied', 'You are not authorized to delete this image.');
            }
        }

        const bucket = storage.bucket(storageBucket.value());
        const deletionPromises: Promise<any>[] = [];

        if (permanentPaths) {
            const pathsToDelete = Object.values(permanentPaths);
            for (const p of pathsToDelete) {
                if (typeof p === 'string') {
                    deletionPromises.push(bucket.file(p).delete().catch(e => logger.warn(`Failed to delete permanent file ${p}: ${e.message}`)));
                }
            }
        }

        if (tempPath) {
            deletionPromises.push(bucket.file(tempPath).delete().catch(e => logger.warn(`Failed to delete temp file ${tempPath}: ${e.message}`)));
        }

        deletionPromises.push(imageDocRef.delete());

        await Promise.all(deletionPromises);

        logger.log(`Successfully deleted image set for imageId: ${imageId}`);
        return { success: true, message: `Image set ${imageId} deleted successfully.` };

    } catch (error) {
        logger.error(`Failed to delete image set for imageId: ${imageId}.`, error);
        throw new HttpsError('internal', 'An unexpected error occurred during image deletion.');
    }
});

export const cleanupTempImages = onSchedule("every 24 hours", async () => {
    logger.log("Running scheduled job to clean up temporary images.");
    const bucket = storage.bucket(storageBucket.value());
    const tempImagesPrefix = "images/temp/";
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const [files] = await bucket.getFiles({ prefix: tempImagesPrefix });
        const deletionPromises: Promise<any>[] = [];

        for (const file of files) {
            const [metadata] = await file.getMetadata();
            if (metadata.timeCreated) {
                const timeCreated = new Date(metadata.timeCreated);

                if (timeCreated < twentyFourHoursAgo) {
                    logger.log(`Deleting old temporary file: ${file.name}`);
                    deletionPromises.push(file.delete());

                    const pathParts = file.name.split('/');
                    const imageId = pathParts.find(part => part.length === 20);
                    if (imageId) {
                        const imageDocRef = db.collection('images').doc(imageId);
                        deletionPromises.push(imageDocRef.delete().catch(e => logger.warn(`Failed to delete orphaned doc ${imageId}: ${e.message}`)));
                    }
                }
            }
        }

        await Promise.all(deletionPromises);
        logger.log("Temporary image cleanup job completed.");

    } catch (error) {
        logger.error("Error during temporary image cleanup:", error);
    }
});

export const updateCategoryArticles = onCall({cors: true}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { changedCategories } = request.data as { changedCategories: Category[] };

    if (!changedCategories || !Array.isArray(changedCategories)) {
        throw new HttpsError('invalid-argument', 'Argument must be an array of changed categories.');
    }

    try {
        const updatePromises = changedCategories.map(async (category) => {
            const articlesSnapshot = await db.collection('articles').where('categoryId', '==', category.id).get();
            if (articlesSnapshot.empty) return;

            const batch = db.batch();
            articlesSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, { categoryName: category.name, categorySlug: category.slug });
            });
            return batch.commit();
        });

        await Promise.all(updatePromises);
        return { success: true, message: 'Articles updated successfully.' };

    } catch (error) {
        logger.error('Error updating articles by category:', error);
        throw new HttpsError('internal', 'An unexpected error occurred while updating articles.');
    }
});
