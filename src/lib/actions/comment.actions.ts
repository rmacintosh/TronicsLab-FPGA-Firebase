'use server';

import { adminFirestore } from '@/firebase/admin';
import { revalidatePath } from 'next/cache';
import { verifyUserRole } from '@/lib/auth-utils'; // CORRECT: Import from the new utility file

// REMOVED: The duplicated verifyUserRole function is no longer here.

export async function deleteCommentAction(authToken: string, commentId: string): Promise<{ success: boolean, message: string }> {
    // CORRECT: Use the imported verifyUserRole function
    const { hasRole, error } = await verifyUserRole(authToken, ['admin', 'moderator']);
    if (!hasRole) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    try {
        const commentRef = adminFirestore.collection('comments').doc(commentId);
        await commentRef.delete();

        revalidatePath('/admin/comments');

        return { success: true, message: 'Comment deleted successfully!' };
    } catch (error: any) {
        console.error('Error in deleteCommentAction:', error);
        return { success: false, message: `Failed to delete comment: ${error.message}` };
    }
}
