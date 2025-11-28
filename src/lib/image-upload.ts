'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, doc, setDoc } from "firebase/firestore";

/**
 * Uploads an image file to a temporary location in Firebase Storage and creates
 * a corresponding document in Firestore.
 *
 * @param file The image file to upload.
 * @param userId The ID of the user uploading the file.
 * @param imageId The pre-generated unique ID for the image.
 * @returns A promise that resolves when the upload is complete.
 */
export const uploadImage = async (
  file: File,
  userId: string,
  imageId: string,
): Promise<void> => {
    const storage = getStorage();
    const db = getFirestore();
    
    // Path for the temporary upload
    const tempPath = `images/temp/${userId}/${imageId}/${file.name}`;
    const storageRef = ref(storage, tempPath);

    // Create the image document in Firestore first. This ensures it exists for cleanup.
    const imageDocRef = doc(db, 'images', imageId);
    await setDoc(imageDocRef, {
      userId,
      imageId,
      tempPath,
      createdAt: new Date(),
      processingComplete: false,
    });
    
    // Metadata to trigger the cloud function
    const metadata = {
      customMetadata: {
        userId,
        imageId,
        isTemp: 'true' // This flag is crucial for the cloud function
      },
    };

    // Upload the file with the metadata
    await uploadBytes(storageRef, file, metadata);
};

/**
 * Uploads an image for embedding directly into the Tiptap editor content.
 * These are not feature images and are stored in a different, permanent path.
 *
 * @param file The image file to upload.
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export const uploadContentImage = async (file: File): Promise<string> => {
    const storage = getStorage();
    
    // This is a simple, permanent path for images embedded in content.
    // We don't need a complex temporary workflow for these.
    const permanentPath = `images/content/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, permanentPath);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
};


/**
 * Calls the 'deleteImageSet' HTTPS Cloud Function to delete an image
 * and all its resized versions from Storage and its document from Firestore.
 *
 * @param imageId The ID of the image document in Firestore.
 * @returns A promise that resolves when the deletion is complete.
 */
export const deleteImage = async (imageId: string): Promise<void> => {
  const functions = getFunctions();
  const deleteImageSet = httpsCallable(functions, 'deleteImageSet');

  try {
    const result = await deleteImageSet({ imageId });
    console.log("Delete function result:", result.data);
  } catch (error) {
    console.error("Error calling deleteImageSet function:", error);
    // We re-throw the error so the calling component can handle it (e.g., show a toast).
    throw new Error("Failed to delete image set.");
  }
};
