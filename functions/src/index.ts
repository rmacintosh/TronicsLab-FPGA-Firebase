import {onObjectFinalized} from "firebase-functions/v2/storage";
import {getStorage} from "firebase-admin/storage";
import {initializeApp} from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import sharp from "sharp";

// Initialize Firebase Admin SDK
initializeApp();

// Get a reference to the storage service
const storage = getStorage();

const THUMB_WIDTH = 200;
const MEDIUM_WIDTH = 1024;
const LARGE_WIDTH = 1920;

export const generateThumbnails = onObjectFinalized({cpu: 2},
  async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const fileName = path.basename(filePath);

    // Exit if this is triggered on a file that is not an image.
    if (!contentType || !contentType.startsWith("image/")) {
      return logger.log("This is not an image.");
    }

    // Exit if the image is already in a resized directory.
    const dirName = path.dirname(filePath);
    if (['thumb', 'medium', 'large'].includes(dirName)) {
      return logger.log(`Already a resized image in folder: ${dirName}`);
    }

    const bucket = storage.bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const metadata = {contentType};

    // Download file from bucket.
    await bucket.file(filePath).download({destination: tempFilePath});
    logger.log("Image downloaded locally to", tempFilePath);

    // Get image metadata to check dimensions
    const imageMetadata = await sharp(tempFilePath).metadata();
    const imageWidth = imageMetadata.width || 0;

    const resizePromises = [];

    // Conditionally generate a large image
    if (imageWidth > LARGE_WIDTH) {
      logger.log(`Generating large size for image width: ${imageWidth}`);
      const largePromise = sharp(tempFilePath)
        .resize({width: LARGE_WIDTH, withoutEnlargement: true})
        .toBuffer()
        .then((data: Buffer) => {
          const largeFilePath = path.join('large', fileName);
          return bucket.file(largeFilePath).save(data, {metadata});
        });
      resizePromises.push(largePromise);
    }

    // Conditionally generate a medium image
    if (imageWidth > MEDIUM_WIDTH) {
       logger.log(`Generating medium size for image width: ${imageWidth}`);
       const mediumPromise = sharp(tempFilePath)
        .resize({width: MEDIUM_WIDTH, withoutEnlargement: true})
        .toBuffer()
        .then((data: Buffer) => {
          const mediumFilePath = path.join('medium', fileName);
          return bucket.file(mediumFilePath).save(data, {metadata});
        });
      resizePromises.push(mediumPromise);
    }

    // Conditionally generate a thumbnail
    if (imageWidth > THUMB_WIDTH) {
      logger.log(`Generating thumb size for image width: ${imageWidth}`);
      const thumbPromise = sharp(tempFilePath)
        .resize({width: THUMB_WIDTH, withoutEnlargement: true})
        .toBuffer()
        .then((data: Buffer) => {
          const thumbFilePath = path.join('thumb', fileName);
          return bucket.file(thumbFilePath).save(data, {metadata});
        });
      resizePromises.push(thumbPromise);
    }

    if (resizePromises.length === 0) {
        logger.log("Image is smaller than all target sizes, no resizing needed.");
        fs.unlinkSync(tempFilePath); // Clean up the downloaded file
        return;
    }

    await Promise.all(resizePromises);

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    logger.log("Finished resizing. Original file is kept.");
    return;
  });
