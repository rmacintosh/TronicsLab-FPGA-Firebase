import { initializeApp, getApps, cert } from 'firebase-admin/app';
import admin from 'firebase-admin';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-2360460009-16468',
  });
}

export const adminApp = admin.app();
export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
