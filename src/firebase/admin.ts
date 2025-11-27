import { initializeApp, getApps } from 'firebase-admin/app';
import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

if (!getApps().length) {
  // Construct the absolute path to the service account key file.
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

  // Read the file synchronously from the disk and parse it as JSON.
  // This is the most direct and reliable way to load the credentials.
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

  initializeApp({
    // Initialize the app using the credentials read directly from the file.
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const adminApp = admin.app();
export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();