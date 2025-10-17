
'use server';
/**
 * @fileOverview A flow to grant admin privileges to the calling user.
 * This is a secure, server-side operation.
 */

import { z } from 'genkit';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { ai } from '../genkit';

const MakeAdminOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

type MakeAdminOutput = z.infer<typeof MakeAdminOutputSchema>;

// Ensure Firebase Admin is initialized only once.
function initializeFirebaseAdmin(): App {
    if (getApps().length) {
      return getApps()[0]!;
    }
    // This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable
    // or other default credentials on Google Cloud infrastructure.
    return initializeApp();
}

const makeAdminFlow = ai.defineFlow(
  {
    name: 'makeAdminFlow',
    inputSchema: z.void(),
    outputSchema: MakeAdminOutputSchema,
    auth: {
      policy: 'client',
      client: { required: true }
    },
  },
  async (_, { auth }) => {
    
    if (!auth) {
      // This check is redundant due to the auth policy above, but serves as a safeguard.
      return {
        success: false,
        message: 'Authentication context is required.',
      };
    }

    const callingUid = auth.uid;
    const adminApp = initializeFirebaseAdmin();
    const adminAuth = getAuth(adminApp);

    // Security Check 1: Ensure the caller is authenticated.
    if (!callingUid) {
      return {
        success: false,
        message: 'Authentication required. You must be logged in to perform this action.',
      };
    }

    // Security Check 2: Check if any admin users already exist.
    // We list all users and check their custom claims. This is not efficient for
    // large user bases, but is acceptable for a one-time setup action.
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
    } catch (error: any)
     {
      console.error(`Failed to set custom claims for UID ${callingUid}:`, error);
      return {
        success: false,
        message: `Failed to set custom claims: ${error.message}`,
      };
    }
  }
);

export async function makeAdmin(): Promise<MakeAdminOutput> {
  return makeAdminFlow();
}
