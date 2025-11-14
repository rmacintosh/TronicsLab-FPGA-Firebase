import { getStorage, ref, uploadBytes } from "firebase/storage";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

export interface ImageData {
  uid: string;
  articleId: string | null;
  createdAt: Date;
  originalPath: string;
  resizedPaths: {
    thumb?: string;
    medium?: string;
    large?: string;
  };
}

/**
 * Uploads an image file to a temporary location in Firebase Storage and
 * listens for the processed image data from Firestore.
 *
 * @param file The image file to upload.
 * @param userId The ID of the user uploading the file.
 * @param imageId The pre-generated unique ID for the image.
 * @param progressCallback A function to call with the upload progress (0-100).
 * @returns A promise that resolves with the Firestore document ID and the final image data.
 */
export const uploadImageAndListen = (
  file: File,
  userId: string,
  imageId: string, // Accept the unique ID as an argument
  progressCallback: (progress: number) => void
): Promise<{ docId: string; data: ImageData }> => {
  return new Promise((resolve, reject) => {
    const storage = getStorage();
    const db = getFirestore();
    
    // Use the provided imageId and the original file name to construct the path.
    const tempPath = `images/temp/${userId}/${imageId}/${file.name}`;
    const storageRef = ref(storage, tempPath);

    const uploadTask = uploadBytes(storageRef, file);

    progressCallback(50); 

    uploadTask.then(snapshot => {
      progressCallback(100);
      const docRef = doc(db, "images", imageId);

      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ImageData;
          console.log("Image data received from Firestore:", data);
          unsubscribe();
          resolve({ docId: docSnap.id, data });
        }
      }, (error) => {
        console.error("Firestore snapshot error:", error);
        unsubscribe();
        reject(error);
      });

    }).catch(error => {
      console.error("Upload failed:", error);
      reject(error);
    });
  });
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
