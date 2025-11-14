
import {onObjectFinalized} from "firebase-functions/v2/storage";
import {onRequest} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import sharp from "sharp";
import {defineString} from "firebase-functions/params";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();
const storage = getStorage();

const THUMB_WIDTH = 200;
const MEDIUM_WIDTH = 1024;
const LARGE_WIDTH = 1920;

// Define the GCLOUD_STORAGE_BUCKET parameter
const storageBucket = defineString("GCLOUD_STORAGE_BUCKET");

export const generateThumbnails = onObjectFinalized({
    cpu: 2,
    bucket: storageBucket, 
  }, async (event) => {

    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    logger.log(`New file detected: ${filePath} in bucket: ${fileBucket}`);

    if (!contentType || !contentType.startsWith("image/")) {
      return logger.log("This is not an image.");
    }
    
    if (!path.dirname(filePath).startsWith('images/temp')) {
        return logger.log(`File is not in a temp directory, skipping.`);
    }

    if (path.basename(filePath).includes('_thumb') || path.basename(filePath).includes('_medium') || path.basename(filePath).includes('_large')) {
      return logger.log("Already a resized image, skipping.");
    }

    const bucket = storage.bucket(fileBucket);
    const fileName = path.basename(filePath);
    const pathParts = path.dirname(filePath).split('/');
    const authorId = pathParts[2];
    const imageId = pathParts[3];

    if (!authorId || !imageId) {
      logger.error("Could not extract authorId or imageId from path:", filePath);
      return;
    }
    
    const tempFileName = `${imageId}-${fileName}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    const metadata = {contentType};

    try {
        await bucket.file(filePath).download({destination: tempFilePath});
        logger.log("Image downloaded locally to", tempFilePath);
    } catch (error) {
        logger.error("Failed to download file:", error);
        return;
    }

    const imageMetadata = await sharp(tempFilePath).metadata();
    const imageWidth = imageMetadata.width || 0;

    const sizes = {
        ...(imageWidth > THUMB_WIDTH && { thumb: THUMB_WIDTH }),
        ...(imageWidth > MEDIUM_WIDTH && { medium: MEDIUM_WIDTH }),
        ...(imageWidth > LARGE_WIDTH && { large: LARGE_WIDTH }),
    };

    const uploadPromises: Promise<any>[] = [];
    const resizedPaths: { [key: string]: string } = {};

    for (const [name, width] of Object.entries(sizes)) {
        const newFileName = `${path.parse(fileName).name}_${name}${path.parse(fileName).ext}`;
        const newFilePath = path.join(path.dirname(filePath), newFileName);
        
        const buffer = await sharp(tempFilePath)
            .resize({ width, withoutEnlargement: true })
            .toBuffer();
            
        resizedPaths[name] = newFilePath;
        uploadPromises.push(bucket.file(newFilePath).save(buffer, { metadata }));
    }
    
    try {
        await Promise.all(uploadPromises);
    } catch (error) {
        logger.error("Failed to upload resized images:", error);
        fs.unlinkSync(tempFilePath);
        return;
    }

    const imageDocData = {
        authorId,
        articleId: null,
        createdAt: new Date(),
        originalPath: filePath,
        resizedPaths,
        processingComplete: true,
    };

    try {
        await db.collection("images").doc(imageId).set(imageDocData);
        logger.log("Successfully created Firestore document:", imageId);
    } catch (error) {
        logger.error("Failed to create Firestore document:", error);
    }

    fs.unlinkSync(tempFilePath);
    logger.log("Cleaned up temporary file.");
});

export const deleteImageSet = onRequest({cors: true}, async (req, res) => {
    logger.log("deleteImageSet function triggered.");

    const { imageId } = req.body;
    if (!imageId) {
        logger.error("Request body must contain 'imageId'.");
        res.status(400).send({error: "Request body must contain 'imageId'"});
        return;
    }

    logger.log(`Attempting to delete image set for imageId: ${imageId}`);

    const imageDocRef = db.collection("images").doc(imageId);
    const imageDoc = await imageDocRef.get();

    if (!imageDoc.exists) {
        logger.error(`Image document with ID ${imageId} not found.`);
        res.status(404).send({error: "Image not found."} );
        return;
    }

    const imageData = imageDoc.data();
    if (!imageData) {
        logger.error(`Image document with ID ${imageId} has no data.`);
        res.status(500).send({error: "Internal server error: Image document is empty."} );
        return;
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
    
    res.status(200).send({ success: true, message: `Image set ${imageId} deleted successfully.` });
});
