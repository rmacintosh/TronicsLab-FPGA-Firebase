import { initializeApp, getApps, App } from 'firebase-admin/app';
import admin, { ServiceAccount } from 'firebase-admin';
import serviceAccount from '../../firebase-admin.json';

let app: App;

if (!getApps().length) {
  app = initializeApp({
    credential: admin.credential.cert(serviceAccount as ServiceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
} else {
  app = getApps()[0];
}

export const adminApp = app;
export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
