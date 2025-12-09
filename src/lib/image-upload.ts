
'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, doc, setDoc, collection } from "firebase/firestore";

/**
 * Uploads a feature image file to a temporary location in Firebase Storage and creates
 * a corresponding document in Firestore.
 *
 * @param file The image file to upload.
 * @param userId The ID of the user uploading the file.
 * @param imageId The pre-generated unique ID for the image.
 * @param articleId The pre-generated unique ID for the associated article.
 * @returns A promise that resolves when the upload is complete.
 */
export const uploadImage = async (
  file: File,
  userId: string,
  imageId: string,
  articleId: string, 
): Promise<void> => {
    const storage = getStorage();
    const db = getFirestore();
    
    const tempPath = `images/temp/${userId}/${imageId}/${file.name}`;
    const storageRef = ref(storage, tempPath);

    const imageDocRef = doc(db, 'images', imageId);
    await setDoc(imageDocRef, {
      userId,
      articleId, 
      imageId,
      tempPath,
      originalFilename: file.name,
      createdAt: new Date(),
      processingComplete: false,
      isFeatureImage: true, 
    });
    
    const metadata = {
      customMetadata: {
        userId,
        imageId,
        articleId, 
        isTemp: 'true'
      },
    };

    await uploadBytes(storageRef, file, metadata);
};

/**
 * Uploads an image for embedding in Tiptap, creates a tracking document in Firestore,
 * and uploads the file to a temporary location in Storage.
 *
 * @param file The image file to upload.
 * @param userId The ID of the currently authenticated user.
 * @param articleId The ID of the article the image is being uploaded for.
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export const uploadContentImage = async (file: File, userId: string, articleId: string): Promise<string> => {
    const storage = getStorage();
    const db = getFirestore();

    // 1. Generate a unique ID for the image document.
    const imageDocRef = doc(collection(db, "images"));
    const imageId = imageDocRef.id;

    // 2. Define the temporary path in Storage.
    const tempPath = `images/temp/${userId}/content/${imageId}/${file.name}`;
    const storageRef = ref(storage, tempPath);

    // 3. Create the tracking document in Firestore *before* uploading.
    await setDoc(imageDocRef, {
        userId,
        articleId,
        imageId,
        tempPath,
        originalFilename: file.name,
        createdAt: new Date(),
        processingComplete: false,
        isFeatureImage: false,
    });

    // 4. Prepare metadata for the Storage object.
    const metadata = {
        customMetadata: {
            userId,
            imageId,
            articleId,
            isTemp: 'true'
        },
    };

    // 5. Upload the file to the temporary location with metadata.
    await uploadBytes(storageRef, file, metadata);

    // 6. Return the direct download URL for immediate display in the editor.
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
};


/**
 * Calls the 'deleteImageSet' HTTPS Cloud Function to delete an image
 * and all its resized versions from Storage and its document from Firestore.
 *
 * @param imageId The ID of the image document in Firestore.
 * @param userId The ID of the user who owns the image.
 * @param articleId The ID of the article the image is associated with.
 * @returns A promise that resolves when the deletion is complete.
 */
export const deleteImage = async (imageId: string, userId: string, articleId: string): Promise<void> => {
  const functions = getFunctions();
  const deleteImageSet = httpsCallable(functions, 'deleteImageSet');

  try {
    const result = await deleteImageSet({ imageId, userId, articleId });
    console.log("Delete function result:", result.data);
  } catch (error) {
    console.error("Error calling deleteImageSet function:", error);
    throw new Error("Failed to delete image set.");
  }
};
