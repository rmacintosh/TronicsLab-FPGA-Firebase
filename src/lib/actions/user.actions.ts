
'use server';

import { getAuth, UserRecord } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import { adminFirestore } from '@/firebase/admin';
import { User, UserRole } from '@/lib/server-types';
import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/auth-utils';

// Corrected action to properly read displayName from Firestore.
export async function getAllUsersAction(authToken: string): Promise<{ success: boolean; users?: User[]; message?: string }> {
    const { isAdmin, error } = await verifyAdmin(authToken);
    if (!isAdmin) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    try {
        const adminAuth = getAuth(getApps()[0]);
        const userRecords: UserRecord[] = [];
        let pageToken: string | undefined;

        do {
            const listUsersResult = await adminAuth.listUsers(1000, pageToken);
            userRecords.push(...listUsersResult.users);
            pageToken = listUsersResult.pageToken;
        } while (pageToken);

        const userDocsSnapshot = await adminFirestore.collection('users').get();
        const firestoreUsers = new Map(userDocsSnapshot.docs.map(doc => [doc.id, doc.data()]));

        const combinedUsers: User[] = userRecords.map(userRecord => {
            const firestoreData = firestoreUsers.get(userRecord.uid);

            // Correctly prioritize Firestore displayName, then Auth, then fallback to email.
            const displayName = (firestoreData?.displayName || userRecord.displayName) || (userRecord.email ? userRecord.email.split('@')[0] : 'Anonymous');
            
            // Ensure roles is always an array, defaulting to ['user']
            const roles = firestoreData?.roles || (userRecord.customClaims?.roles ? (Array.isArray(userRecord.customClaims.roles) ? userRecord.customClaims.roles : [userRecord.customClaims.roles]) : ['user']);

            return {
                uid: userRecord.uid,
                displayName: displayName,
                email: userRecord.email || 'N/A',
                photoURL: userRecord.photoURL || firestoreData?.photoURL || '/default-avatar.png',
                roles: roles,
                createdAt: userRecord.metadata.creationTime,
            };
        });

        return { success: true, users: combinedUsers };

    } catch (error: any) {
        console.error('Error fetching all users:', error);
        return { success: false, message: `Failed to fetch users: ${error.message}` };
    }
}

export async function updateUserRolesAction(authToken: string, uid: string, role: UserRole): Promise<{ success: boolean; message: string }> {
  const { isAdmin, decodedToken, error } = await verifyAdmin(authToken);
  if (!isAdmin || !decodedToken) {
      return { success: false, message: error || 'Authorization failed.' };
  }

  try {
    if (decodedToken.uid === uid) {
      return { success: false, message: 'Cannot change your own role.' };
    }

    const newRoles = [role]; // Enforce a single role in an array
    const adminAuth = getAuth(getApps()[0]);
    await adminAuth.setCustomUserClaims(uid, { roles: newRoles });

    const userRef = adminFirestore.collection('users').doc(uid);
    await userRef.update({ roles: newRoles });

    revalidatePath('/admin/users');

    return { success: true, message: 'User role updated successfully.' };
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return { success: false, message: `Failed to update user role: ${error.message}` };
  }
}

export async function deleteUserAction(authToken: string, uid: string): Promise<{ success: boolean; message: string, name?: string }> {
  const { isAdmin, decodedToken, error } = await verifyAdmin(authToken);
  if (!isAdmin || !decodedToken) {
      return { success: false, message: error || 'Authorization failed.' };
  }

  try {
    if (decodedToken.uid === uid) {
      return { success: false, message: 'Cannot delete your own account.' };
    }

    const adminAuth = getAuth(getApps()[0]);
    const userRef = adminFirestore.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userName = userDoc.data()?.displayName || 'Unknown User';

    await adminAuth.deleteUser(uid);
    await userRef.delete();

    revalidatePath('/admin/users');

    return { success: true, message: `User ${userName} deleted successfully.`, name: userName };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, message: `Failed to delete user: ${error.message}` };
  }
}

// Updated to enforce displayName on creation.
export async function createUserDocumentAction(authToken: string, name: string): Promise<{ success: boolean; message: string }> {
    if (!authToken) {
        return { success: false, message: 'Authentication required. No auth token provided.' };
    }

    try {
        const adminAuth = getAuth(getApps()[0]);
        const decodedToken = await adminAuth.verifyIdToken(authToken);
        const uid = decodedToken.uid;
        const userEmail = decodedToken.email;
        
        if (!userEmail) {
            return { success: false, message: 'User email not found in auth token.' };
        }

        const userRef = adminFirestore.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            return { success: true, message: 'User document already exists.' };
        }
        
        const userRecord = await adminAuth.getUser(uid);
        const creationTime = userRecord.metadata.creationTime;

        // Enforce displayName: use provided name, existing token name, or derive from email.
        const finalName = (name && name.trim()) || decodedToken.displayName || userEmail.split('@')[0];
        const defaultRoles: UserRole[] = ['user'];

        // Update both Firebase Auth and Firestore to ensure consistency.
        await adminAuth.updateUser(uid, { displayName: finalName });
        await adminAuth.setCustomUserClaims(uid, { roles: defaultRoles });

        const newUser: User = {
            uid: uid,
            displayName: finalName,
            email: userEmail,
            photoURL: decodedToken.picture || '/default-avatar.png', 
            roles: defaultRoles,
            createdAt: creationTime,
        };

        await userRef.set(newUser);

        revalidatePath('/'); // Revalidate all paths to reflect the new user info.

        return { success: true, message: 'User document created successfully.' };

    } catch (error: any) {
        console.error('Error in createUserDocumentAction:', error);
        return { success: false, message: `Failed to create user document: ${error.message}` };
    }
}
