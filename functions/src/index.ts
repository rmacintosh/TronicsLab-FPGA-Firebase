import {onObjectFinalized} from "firebase-functions/v2/storage";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import sharp from "sharp";
import {defineString} from "firebase-functions/params";
import { Category } from "./server-types";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();
const storage = getStorage();

const THUMB_WIDTH = 200;
const MEDIUM_WIDTH = 1024;
const LARGE_WIDTH = 1920;

// Define the GCLOUD_STORAGE_BUCKET parameter
const storageBucket = defineString("GCLOUD_STORAGE_BUCKET");

async function getPermanentSignedUrl(filePath: string, bucketName: string): Promise<string> {
    const options = { action: 'read' as const, expires: '03-09-2491' };
    const [url] = await storage.bucket(bucketName).file(filePath).getSignedUrl(options);
    return url;
}

// FINAL, CORRECTED VERSION: Fixes the ENOENT race condition.
export const generateThumbnails = onObjectFinalized({
    cpu: 2,
    bucket: storageBucket, 
  }, async (event) => {

    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const metadata = event.data.metadata;

    if (!contentType || !contentType.startsWith("image/")) {
        return logger.log("This is not an image.");
    }

    // This check is now robust because we remove the isTemp flag after processing.
    if (!metadata || metadata.isTemp !== 'true') {
        return logger.log(`File is not a temporary upload, skipping: ${filePath}`);
    }

    if (path.basename(filePath).includes('_thumb') || path.basename(filePath).includes('_medium') || path.basename(filePath).includes('_large')) {
        return logger.log(`Already a resized image, skipping: ${filePath}`);
    }

    const bucket = storage.bucket(fileBucket);
    const fileName = path.basename(filePath);
    const { userId, imageId } = metadata;

    if (!userId || !imageId) {
        return logger.error("Missing userId or imageId in metadata for:", filePath);
    }
    
    // --- THIS IS THE FIX ---
    // Use the unique event ID to create a unique temporary file path for each execution.
    const tempFilePath = path.join(os.tmpdir(), `${event.id}-${fileName}`);

    try {
        await bucket.file(filePath).download({ destination: tempFilePath });
    } catch (error) {
        return logger.error("Failed to download file:", error);
    }

    // Resize images
    const imageMetadata = await sharp(tempFilePath).metadata();
    const imageWidth = imageMetadata.width || 0;
    const sizes = {
        ...(imageWidth > THUMB_WIDTH && { thumb: THUMB_WIDTH }),
        ...(imageWidth > MEDIUM_WIDTH && { medium: MEDIUM_WIDTH }),
        ...(imageWidth > LARGE_WIDTH && { large: LARGE_WIDTH }),
    };
    const resizedPaths: { [key: string]: string } = {};
    const uploadPromises = Object.entries(sizes).map(([name, width]) => {
        const newFileName = `${path.parse(fileName).name}_${name}${path.parse(fileName).ext}`;
        const newFilePath = `images/${userId}/${imageId}/${newFileName}`;
        resizedPaths[name] = newFilePath;
        return sharp(tempFilePath).resize({ width }).toBuffer()
            .then(buffer => bucket.file(newFilePath).save(buffer, { metadata: { contentType } }));
    });
    
    try {
        await Promise.all(uploadPromises);
    } catch (error) {
        fs.unlinkSync(tempFilePath); // Clean up on failure
        return logger.error("Failed to upload resized images:", error);
    }
    
    // Move original image and then remove the isTemp flag to prevent re-triggering.
    const permanentOriginalPath = `images/${userId}/${imageId}/${fileName}`;
    try {
        await bucket.file(filePath).move(permanentOriginalPath);
        // --- THIS IS THE FIX --- 
        // Remove the metadata flag to prevent the function from re-triggering itself.
        await bucket.file(permanentOriginalPath).setMetadata({ metadata: { isTemp: null } });
    } catch(err) {
        fs.unlinkSync(tempFilePath); // Clean up on failure
        return logger.error("Could not move original file or update metadata.", err);
    }

    // Get permanent URLs
    const permanentUrls: { [key: string]: string } = {};
    try {
        permanentUrls['originalUrl'] = await getPermanentSignedUrl(permanentOriginalPath, fileBucket);
        for (const [name, resizedPath] of Object.entries(resizedPaths)) {
            permanentUrls[`${name}Url`] = await getPermanentSignedUrl(resizedPath, fileBucket);
        }
    } catch (error) {
        fs.unlinkSync(tempFilePath); // Clean up on failure
        return logger.error("Failed to generate signed URLs:", error);
    }
    
    // Update Firestore document
    const imageDocData = {
        userId: userId,
        articleId: null,
        createdAt: new Date(),
        permanentPaths: { original: permanentOriginalPath, ...resizedPaths },
        permanentUrls,
        processingComplete: true,
    };
    try {
        await db.collection("images").doc(imageId).set(imageDocData);
    } catch (error) {
        return logger.error("Failed to create Firestore document:", error);
    }

    fs.unlinkSync(tempFilePath);
    logger.log(`Processing complete for imageId: ${imageId}`)
});


export const deleteImageSet = onCall({cors: true}, async (request) => {
    logger.log("deleteImageSet function triggered.");

    if (!request.auth) {
        logger.error("Function must be called while authenticated.");
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { imageId } = request.data;
    if (!imageId) {
        logger.error("Request data must contain 'imageId'.");
        throw new HttpsError('invalid-argument', "Request data must contain 'imageId'.");
    }

    const uid = request.auth.uid;
    const roles = request.auth.token.roles || [];
    const isAdmin = roles.includes('admin');

    logger.log(`Attempting to delete image set for imageId: ${imageId} by user: ${uid}`);

    const imageDocRef = db.collection("images").doc(imageId);
    const imageDoc = await imageDocRef.get();

    if (!imageDoc.exists) {
        logger.error(`Image document with ID ${imageId} not found.`);
        throw new HttpsError('not-found', "Image not found.");
    }

    const imageData = imageDoc.data();
    if (!imageData) {
        logger.error(`Image document with ID ${imageId} has no data.`);
        throw new HttpsError('internal', "Internal server error: Image document is empty.");
    }
    
    if (imageData.userId !== uid && !isAdmin) {
        logger.error(`User ${uid} is not authorized to delete image ${imageId} owned by ${imageData.userId}.`);
        throw new HttpsError('permission-denied', 'You are not authorized to delete this image.');
    }

    const bucket = storage.bucket(storageBucket.value());

    const pathsToDelete: string[] = [];
    if (imageData.originalPath) {
        pathsToDelete.push(imageData.originalPath);
    }
    if (imageData.resizedPaths && typeof imageData.resizedPaths === 'object') {
        Object.values(imageData.resizedPaths).forEach((p: any) => {
            if (typeof p === 'string') {
                pathsToDelete.push(p);
            }
        });
    }

    const deletePromises = pathsToDelete.map(filePath => {
        return bucket.file(filePath).delete().catch(error => {
            logger.error(`Failed to delete file: ${filePath}`, error);
        });
    });

    try {
        await Promise.all(deletePromises);
        logger.log(`Successfully deleted associated files from Storage for imageId: ${imageId}`);
    } catch(err) {
        logger.error("Error deleting files from storage", err);
    }

    await imageDocRef.delete();
    logger.log(`Successfully deleted Firestore document for imageId: ${imageId}`);
    
    return { success: true, message: `Image set ${imageId} deleted successfully.` };
});

interface UpdateData {
    changedCategories: Category[];
}

export const updateCategoryArticles = onCall(async (request) => {
    logger.log("updateCategoryArticles function triggered.");

    if (!request.auth) {
        logger.error("Function must be called while authenticated.");
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { changedCategories } = request.data as UpdateData;

    if (!changedCategories || !Array.isArray(changedCategories)) {
        logger.error("Invalid argument: changedCategories must be an array.");
        throw new HttpsError('invalid-argument', 'The function must be called with an array of changed categories.');
    }

    try {
        const articleUpdates = changedCategories.map(async (category) => {
            logger.log(`Processing category: ${category.id} (${category.name})`);
            const articlesSnapshot = await db.collection('articles').where('categoryId', '==', category.id).get();
            
            if (articlesSnapshot.empty) {
                logger.log(`No articles found for category ${category.id}.`);
                return;
            }

            logger.log(`Found ${articlesSnapshot.size} articles to update for category ${category.id}.`);
            const batch = db.batch();
            articlesSnapshot.docs.forEach(doc => {
                const articleRef = db.collection('articles').doc(doc.id);
                batch.update(articleRef, {
                    categoryName: category.name,
                    categorySlug: category.slug,
                });
            });
            return batch.commit();
        });

        await Promise.all(articleUpdates);

        logger.log("All articles have been successfully updated.");
        return { success: true, message: 'All articles have been successfully updated.' };

    } catch (error) {
        logger.error('Error updating articles by category:', error);
        throw new HttpsError('internal', 'An unexpected error occurred while updating the articles.');
    }
});
