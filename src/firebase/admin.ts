
import { initializeApp, getApps, App } from 'firebase-admin/app';
import admin from 'firebase-admin';

let app: App;

if (!getApps().length) {
  app = initializeApp({
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
} else {
  app = getApps()[0];
}

export const adminApp = app;
export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
