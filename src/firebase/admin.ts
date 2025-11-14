import { initializeApp, getApps } from 'firebase-admin/app';
import admin from 'firebase-admin';

if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}

export const adminApp = admin.app();
export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();