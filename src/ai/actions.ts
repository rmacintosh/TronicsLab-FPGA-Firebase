'use server';

import { makeAdmin } from './flows/make-admin-flow';
import type { MakeAdminOutput } from './flows/make-admin-flow';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import '@/firebase/admin';

/**
 * A client-callable server action that executes the makeAdminFlow.
 */
export async function makeAdminAction(authToken: string): Promise<MakeAdminOutput> {
  if (!authToken) {
    return {
      success: false,
      message: 'Authentication required. No auth token provided.',
    };
  }

  try {
    const adminApp = getApps()[0]; 
    if (!adminApp) {
      return {
        success: false,
        message: 'Firebase Admin SDK not initialized on the server.',
      };
    }
    const adminAuth = getAuth(adminApp);
    const decodedToken = await adminAuth.verifyIdToken(authToken);
    const callingUid = decodedToken.uid;

    const flowContext = { auth: { uid: callingUid, token: decodedToken } };

    return await makeAdmin(undefined, { context: flowContext });

  } catch (error: any) {
    console.error("Error in makeAdminAction:", error);
    return {
      success: false,
      message: `Authentication failed: ${error.message}`,
    };
  }
}
