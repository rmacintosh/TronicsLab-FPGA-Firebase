'use server';
/**
 * @fileOverview A flow to grant admin privileges to the calling user.
 * This is a secure, server-side operation.
 */

import { z } from 'genkit';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps } from 'firebase-admin/app';
import { ai } from '../genkit';
import '@/firebase/admin'; // Ensure Firebase Admin is initialized

const MakeAdminOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type MakeAdminOutput = z.infer<typeof MakeAdminOutputSchema>;

// Define the flow with its logic.
const makeAdminFlow = ai.defineFlow(
  {
    name: 'makeAdminFlow',
    inputSchema: z.void(),
    outputSchema: MakeAdminOutputSchema,
  },
  async (_, sideChannel) => {
    const auth = sideChannel.context?.auth as any;

    if (!auth || !auth.uid) {
      return {
        success: false,
        message: 'Authentication required. You must be logged in to perform this action.',
      };
    }

    const callingUid = auth.uid;

    const adminApp = getApps()[0];
    if (!adminApp) {
        return {
            success: false,
            message: 'Firebase Admin SDK not initialized on the server.',
        };
    }
    const adminAuth = getAuth(adminApp);
    const adminFirestore = getFirestore(adminApp);

    try {
      const listUsersResult = await adminAuth.listUsers(1000);
      const adminExists = listUsersResult.users.some(user => !!user.customClaims?.admin);

      if (adminExists) {
        return {
          success: false,
          message: 'An admin user already exists. This action can only be performed for initial setup.',
        };
      }
    } catch (error: any) {
      console.error("Error listing users:", error);
      return { success: false, message: `Failed to verify existing users: ${error.message}` };
    }

    try {
      // Set the custom claim in Firebase Authentication
      await adminAuth.setCustomUserClaims(callingUid, { admin: true });

      // Also, update the user's document in the Firestore database
      const userDocRef = adminFirestore.collection('users').doc(callingUid);
      await userDocRef.set({ roles: ['admin'] }, { merge: true });

      return {
        success: true,
        message: `Successfully granted admin privileges to user ${callingUid}.`,
      };
    } catch (error: any) {
      console.error(`Failed to grant admin privileges for UID ${callingUid}:`, error);
      return {
        success: false,
        message: `Failed to grant admin privileges: ${error.message}`,
      };
    }
  }
);

// Export the flow directly to be called by the server action.
export { makeAdminFlow as makeAdmin };
