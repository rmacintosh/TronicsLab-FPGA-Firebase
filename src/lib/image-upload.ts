'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, doc, collection } from "firebase/firestore";

/**
 * Uploads an image file to a temporary location in Firebase Storage.
 *
 * @param file The image file to upload.
 * @param userId The ID of the user uploading the file.
 * @param imageId The pre-generated unique ID for the image.
 * @returns A promise that resolves with the temporary path of the uploaded file.
 */
export const uploadImage = async (
  file: File,
  userId: string,
  imageId: string,
): Promise<{ tempPath: string }> => {
    const storage = getStorage();
    const tempPath = `images/temp/${userId}/${imageId}/${file.name}`;
    const storageRef = ref(storage, tempPath);

    const metadata = {
      customMetadata: {
        userId,
        imageId,
      },
    };

    await uploadBytes(storageRef, file, metadata);
    return { tempPath };
};

/**
 * Uploads an image for embedding directly into the Tiptap editor content.
 * Generates a unique ID on the client and uploads to a permanent, public path.
 *
 * @param file The image file to upload.
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export const uploadContentImage = async (file: File): Promise<string> => {
    const storage = getStorage();
    const db = getFirestore();

    // Generate a unique ID on the client using a new Firestore document reference.
    const imageDocRef = doc(collection(db, 'images'));
    const imageId = imageDocRef.id;

    // We use a permanent path because these images are part of the article content.
    // They are not temporary and won't be processed further.
    const permanentPath = `images/content/${imageId}/${file.name}`;
    const storageRef = ref(storage, permanentPath);

    // Upload the file
    await uploadBytes(storageRef, file);

    // Get the public download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
};


/**
 * Calls the 'deleteImageSet' HTTPS Cloud Function to delete an image
 * and all its resized versions from Storage and Firestore.
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
    throw new Error("Failed to delete image set.");
  }
};
