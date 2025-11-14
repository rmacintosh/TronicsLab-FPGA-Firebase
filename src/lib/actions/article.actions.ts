'use server';

import { Article, UserRole } from '@/lib/server-types';
import { NewArticleData } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import {
  processAndCreateArticle,
  deleteArticleAndAssociatedImage,
} from '@/lib/article-helpers';
import { adminFirestore } from '@/firebase/admin';
import { verifyUser, verifyUserRole } from '@/lib/auth-utils'; // CORRECT: Import from the new utility file

// REMOVED: The duplicated verifyUserRole function is no longer here.

export async function createArticleAction(
  authToken: string,
  articleData: NewArticleData
): Promise<{ success: boolean; message: string; slug?: string }> {
  // CORRECT: Use the imported verifyUserRole function
  const { hasRole, decodedToken, error } = await verifyUserRole(authToken, ['admin', 'author']);
  if (!hasRole || !decodedToken) {
      return { success: false, message: error || 'Authorization failed.' };
  }

  try {
    const result = await processAndCreateArticle(decodedToken.uid, articleData);

    if (result.success) {
      revalidatePath('/admin/articles');
      revalidatePath(`/articles/${articleData.slug}`);
    }

    return result;
  } catch (error: any) {
    console.error('Error in createArticleAction:', error);
    return { success: false, message: `Failed to create article: ${error.message}` };
  }
}

export async function updateArticleAction(
  authToken: string,
  articleId: string,
  articleData: Partial<Article>
): Promise<{ success: boolean; message: string; slug?: string }> {
  // CORRECT: Use the imported verifyUserRole function
  const { hasRole, error } = await verifyUserRole(authToken, ['admin', 'author']);
  if (!hasRole) {
      return { success: false, message: error || 'Authorization failed.' };
  }

  try {
    const articleRef = adminFirestore.collection('articles').doc(articleId);
    // ... (rest of the logic is unchanged)
    const sanitizedPayload: { [key: string]: any } = {};
    (Object.keys(articleData) as Array<keyof typeof articleData>).forEach((key) => {
      if (articleData[key] !== undefined) {
        sanitizedPayload[key] = articleData[key];
      }
    });
    if (sanitizedPayload.image && typeof sanitizedPayload.image === 'object') {
      const sanitizedImage: { [key: string]: any } = {};
      const image = sanitizedPayload.image as any;
      if (image.id !== undefined) sanitizedImage.id = image.id;
      if (image.imageUrl !== undefined) sanitizedImage.imageUrl = image.imageUrl;
      if (image.imageHint !== undefined) sanitizedImage.imageHint = image.imageHint;
      sanitizedPayload.image = sanitizedImage;
    }
    if (Object.keys(sanitizedPayload).length === 0) {
      return { success: true, message: 'No changes to update.' };
    }
    await articleRef.update(sanitizedPayload);
    revalidatePath('/admin/articles');
    if (articleData.slug) {
      revalidatePath(`/articles/${articleData.slug}`);
    }
    return {
      success: true,
      message: 'Article updated successfully!',
      slug: articleData.slug,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'An unexpected response was received from the server';
    return { success: false, message: `Error updating article: ${errorMessage}` };
  }
}

export async function deleteArticleAction(
  authToken: string,
  articleId: string
): Promise<{ success: boolean; message: string }> {
  const { user, error: userError } = await verifyUser(authToken);
  if (!user) {
    return { success: false, message: userError || 'Authentication failed.' };
  }

  try {
    // Pass the user's UID to the helper function for authorization
    const result = await deleteArticleAndAssociatedImage(articleId, user.uid);

    if (result.success) {
      revalidatePath('/admin/articles');
    }

    return result;
  } catch (error: any) {
    console.error('Error in deleteArticleAction:', error);
    return { success: false, message: `Failed to delete article: ${error.message}` };
  }
}
