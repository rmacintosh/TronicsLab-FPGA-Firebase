'use server';

import { Article as ServerArticle } from '@/lib/server-types';
import { Article, NewArticleData } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import {
  processAndCreateArticle,
  deleteArticleAndAssociatedImage,
} from '@/lib/article-helpers';
import { adminFirestore } from '@/firebase/admin';
import { verifyUser, verifyUserRole } from '@/lib/auth-utils';

export async function createArticleAction(
  authToken: string,
  articleData: NewArticleData
): Promise<{ success: boolean; message: string; slug?: string }> {
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
  const { hasRole, error } = await verifyUserRole(authToken, ['admin', 'author']);
  if (!hasRole) {
      return { success: false, message: error || 'Authorization failed.' };
  }

  try {
    const articleRef = adminFirestore.collection('articles').doc(articleId);
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

export async function getAllArticlesAction(authToken: string): Promise<{ success: boolean; message?: string; articles?: Article[] }> {
    try {
        const { user, error: userError } = await verifyUser(authToken);
        if (!user) {
            return { success: false, message: userError || 'Authentication failed.' };
        }

        const categoriesSnapshot = await adminFirestore.collection('categories').get();
        const categoryMap = new Map<string, string>();
        categoriesSnapshot.docs.forEach(doc => {
            categoryMap.set(doc.id, doc.data().name);
        });

        const articlesSnapshot = await adminFirestore.collection('articles').get();
        const articles: Article[] = articlesSnapshot.docs.map(doc => {
            const data = doc.data() as ServerArticle;
            return {
                ...data,
                category: categoryMap.get(data.categoryId) || 'Uncategorized',
            };
        });

        return { success: true, articles };
    } catch (error: any) {
        console.error('Error in getAllArticlesAction:', error);
        return { success: false, message: `Failed to get articles: ${error.message}` };
    }
}
