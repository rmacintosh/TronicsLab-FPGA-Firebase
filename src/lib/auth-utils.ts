'use server';

import { DecodedIdToken } from 'firebase-admin/auth';
// CORRECTED: Import the initialized adminAuth service directly, do not try to get the app instance.
import { adminAuth, adminFirestore } from '@/firebase/admin';
import { UserRole } from '@/lib/server-types';

/**
 * Verifies a user's auth token and returns the decoded token.
 * @param authToken The Firebase ID token of the user.
 * @returns A promise that resolves to an object containing the decoded token or an error.
 */
export const verifyUser = async (authToken: string): Promise<{ user?: DecodedIdToken; error?: string }> => {
    if (!authToken) {
        return { error: 'Authentication required.' };
    }

    try {
        // Use the already-initialized adminAuth instance.
        const decodedToken = await adminAuth.verifyIdToken(authToken);
        return { user: decodedToken };
    } catch (error) {
        return { error: 'Invalid authentication token.' };
    }
};

/**
 * Verifies a user's role(s) based on their auth token.
 * This function checks both the token claims and the user's document in Firestore.
 * @param authToken The Firebase ID token of the user.
 * @param requiredRoles An array of roles, of which the user must have at least one.
 * @returns A promise that resolves to an object indicating if the user has the required role.
 */
export const verifyUserRole = async (authToken: string, requiredRoles: UserRole[]): Promise<{ hasRole: boolean; decodedToken?: any; error?: string }> => {
    if (requiredRoles.length === 0) {
        return { hasRole: false, error: 'No required roles were specified.' };
    }

    const { user, error } = await verifyUser(authToken);
    if (error || !user) {
        return { hasRole: false, error: error || 'Authentication failed.' };
    }

    // Check token claims first
    const tokenRoles = user.roles || [];
    if (requiredRoles.some(role => tokenRoles.includes(role))) {
        return { hasRole: true, decodedToken: user };
    }

    // Fallback to checking Firestore
    const userDoc = await adminFirestore.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        const firestoreRoles = userData?.roles || [];
        if (requiredRoles.some(role => firestoreRoles.includes(role))) {
            return { hasRole: true, decodedToken: user };
        }
    }

    return { hasRole: false, error: `Authorization required. Must be one of: ${requiredRoles.join(', ')}` };
};

/**
 * Verifies if a user is an admin.
 * This is a convenience wrapper around verifyUserRole.
 * @param authToken The Firebase ID token of the user.
 * @returns A promise that resolves to an object indicating if the user is an admin.
 */
export const verifyAdmin = async (authToken: string): Promise<{ isAdmin: boolean; decodedToken?: any; error?: string }> => {
    const { hasRole, decodedToken, error } = await verifyUserRole(authToken, ['admin']);
    return { isAdmin: hasRole, decodedToken, error };
};
