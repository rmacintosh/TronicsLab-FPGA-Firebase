import { initializeApp, getApps, cert } from 'firebase-admin/app';
import admin from 'firebase-admin';

// Fetch the service account key JSON file
// Replace with the actual path to your service account key file
// This file should NOT be committed to your repository
// and should be stored securely (e.g., in environment variables or a secrets manager)
// For local development, you might place it in the project root and
// reference it using a relative path, but ensure it's in your .gitignore
// and ideally loaded from an environment variable.
// For deployment to Firebase environments (Cloud Functions, App Hosting),
// the Admin SDK can often initialize automatically without explicitly
// providing credentials if the environment is configured correctly.
// However, for other server environments, you'll need to provide the credentials.

// Example: Loading from an environment variable
// const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_SA || '{}');

// Example: Loading from a local file (for development only, use with caution)
// import serviceAccount from './path/to/your/serviceAccountKey.json';

// Initialize the Firebase Admin SDK
if (!getApps().length) {
  // If you are deploying to Firebase environments (Cloud Functions, App Hosting),
  // the Admin SDK can often initialize automatically without explicitly
  // providing credentials. In that case, you might just call initializeApp().
  // If you are running in a different server environment, you will need to
  // provide the service account credentials.

  // Example for development with a local service account key file:
  // initializeApp({
  //   credential: cert(serviceAccount),
  // });

  // Example for deployment where credentials are provided by the environment:
   initializeApp();

}

// Export the initialized admin app and other services you might need
export const adminApp = admin.app();
export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();

// You can add other admin services here as needed, e.g.:
// export const adminRealtimeDb = admin.database();
// export const adminStorage = admin.storage();