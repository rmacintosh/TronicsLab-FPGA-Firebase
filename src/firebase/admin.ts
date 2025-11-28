import { initializeApp, getApps, App } from 'firebase-admin/app';
import admin from 'firebase-admin';

let app: App;

if (!getApps().length) {
  if (process.env.SERVICE_ACCOUNT_KEY_JSON) {
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY_JSON);
    
    // Replace escaped newlines in the private key
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    app = initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    app = initializeApp();
  }
} else {
  app = getApps()[0];
}

export const adminApp = app;
export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
