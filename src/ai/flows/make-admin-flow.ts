'use server';
/**
 * @fileOverview A flow to grant admin privileges to the calling user.
 * This is a secure, server-side operation.
 */

import { z } from 'genkit';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { ai } from '../genkit';
import { firebaseConfig } from '@/firebase/config';
import '@/firebase/admin'; // Ensure Firebase Admin is initialized

const MakeAdminOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type MakeAdminOutput = z.infer<typeof MakeAdminOutputSchema>;

// Ensure Firebase Admin is initialized only once.
function initializeFirebaseAdmin(): App {
    if (getApps().length) {
      return getApps()[0]!;
    }
    return initializeApp({
        projectId: firebaseConfig.projectId,
    });
}

// Define the flow with its logic.
const makeAdminFlow = ai.defineFlow(
  {
    name: 'makeAdminFlow',
    inputSchema: z.void(),
    outputSchema: MakeAdminOutputSchema,
    // Removed auth: { firebase: true } as it's not a valid property in FlowConfig
  },
  async (_, sideChannel) => { // Changed to access sideChannel directly
    // Attempt to access authentication context through sideChannel.context
    const auth = sideChannel.context?.auth as any; // Use optional chaining and type assertion

    // The 'auth' object will be null or undefined if no valid token is provided.
    if (!auth || !auth.uid) {
      return {
        success: false,
        message: 'Authentication required. You must be logged in to perform this action.',
      };
    }

    const callingUid = auth.uid;
    // Use the already initialized admin app
    const adminApp = getApps()[0] || initializeFirebaseAdmin(); // Get the initialized app
    const adminAuth = getAuth(adminApp);

    // Security Check 1: Ensure the caller is authenticated is handled by the check above.

    // Security Check 2: Check if any admin users already exist.
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

    // If security checks pass, grant admin privileges.
    try {
      await adminAuth.setCustomUserClaims(callingUid, { admin: true });
      return {
        success: true,
        message: `Successfully granted admin privileges to user ${callingUid}.`,
      };
    } catch (error: any) {
      console.error(`Failed to set custom claims for UID ${callingUid}:`, error);
      return {
        success: false,
        message: `Failed to set custom claims: ${error.message}`,
      };
    }
  }
);

// Export the flow directly to be called by the server action.
export { makeAdminFlow as makeAdmin };