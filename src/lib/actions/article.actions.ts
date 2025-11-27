'use server';

import { revalidatePath } from 'next/cache';
import { Article, NewArticleData } from '@/lib/types';
import { adminFirestore } from '@/firebase/admin';
import { verifyUser, verifyUserRole } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { deleteArticleAndAssociatedImage } from '@/lib/article-helpers';

// NOTE: The functions related to the old, synchronous article creation process 
// (pollForImageProcessing, moveImageToPermanentStorage, etc.) have been removed 
// as they are obsolete with the new asynchronous seeder architecture.

export async function processAndCreateArticleAction(
  authToken: string,
  articleData: NewArticleData
): Promise<{ success: boolean; message: string; slug?: string }> {
  return { success: false, message: "This action is deprecated. Please use the seeder." };
}

function sanitizeArticleForUpdate(data: Partial<Article>): Partial<Article> {
  const sanitized: Partial<Article> = {};
  if (data.title !== undefined) sanitized.title = data.title;
  if (data.description !== undefined) sanitized.description = data.description;
  if (data.content !== undefined) sanitized.content = data.content;
  if (data.slug !== undefined) sanitized.slug = data.slug;
  if (data.categoryId !== undefined) sanitized.categoryId = data.categoryId;
  return sanitized;
}

export async function updateArticleAction(
  authToken: string,
  articleId: string,
  articleData: Partial<Article>
): Promise<{ success: boolean; message: string; slug?: string }> {
  const { hasRole, error: authError } = await verifyUserRole(authToken, ['admin', 'author']);
  if (!hasRole) {
    return { success: false, message: authError || 'Authorization failed.' };
  }
  try {
    const articleRef = adminFirestore.collection('articles').doc(articleId);
    const sanitizedPayload = sanitizeArticleForUpdate(articleData);
    if (Object.keys(sanitizedPayload).length === 0) {
      return { success: true, message: 'No valid fields to update.' };
    }
    await adminFirestore.runTransaction(async (transaction) => {
      const articleSnap = await transaction.get(articleRef);
      if (!articleSnap.exists) {
        throw new Error('Article not found.');
      }
      const currentArticleData = articleSnap.data() as Article;
      const payloadToUpdate = { ...sanitizedPayload };
      if (payloadToUpdate.categoryId && payloadToUpdate.categoryId !== currentArticleData.categoryId) {
        const newCategoryId = payloadToUpdate.categoryId;
        const oldCategoryId = currentArticleData.categoryId;
        const newCategoryRef = adminFirestore.collection('categories').doc(newCategoryId);
        const newCategorySnap = await transaction.get(newCategoryRef);
        if (!newCategorySnap.exists) {
          throw new Error('The new category selected does not exist.');
        }
        payloadToUpdate.categoryName = newCategorySnap.data()?.name;
        payloadToUpdate.categorySlug = newCategorySnap.data()?.slug;
        transaction.update(newCategoryRef, { articleCount: FieldValue.increment(1) });
        if (oldCategoryId) {
          const oldCategoryRef = adminFirestore.collection('categories').doc(oldCategoryId);
          transaction.update(oldCategoryRef, { articleCount: FieldValue.increment(-1) });
        }
      }
      transaction.update(articleRef, payloadToUpdate);
    });
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
    return { success: false, message: `Failed to delete article: ${error.message}` };
  }
}

export async function getAllArticlesAction(authToken: string): Promise<{ success: boolean; message?: string; articles?: Article[] }> {
    try {
        const { user, error: userError } = await verifyUser(authToken);
        if (!user) {
            return { success: false, message: userError || 'Authentication failed.' };
        }
        const articlesSnapshot = await adminFirestore.collection('articles').get();
        const articles: Article[] = articlesSnapshot.docs.map(doc => doc.data() as Article);
        return { success: true, articles };
    } catch (error: any) {
        return { success: false, message: `Failed to get articles: ${error.message}` };
    }
}

// CORRECTED, FINAL VERSION
export async function linkArticleToImage(
  articleId: string,
  imageId: string,
  imageUrls: { [key: string]: string }
): Promise<{ success: boolean; message: string }> {
  const firestore = adminFirestore;
  const articleRef = firestore.collection('articles').doc(articleId);
  const imageRef = firestore.collection('images').doc(imageId);

  try {
    await firestore.runTransaction(async (transaction) => {
      const articleDoc = await transaction.get(articleRef);
      if (!articleDoc.exists) {
        throw new Error('Article not found during transaction.');
      }

      const articleUpdatePayload: { [key: string]: any } = {};
      for (const [key, value] of Object.entries(imageUrls)) {
        if (value) {
          articleUpdatePayload[`image.${key}`] = value;
        }
      }

      transaction.update(articleRef, articleUpdatePayload);
      transaction.update(imageRef, { articleId: articleId });
    });

    const articleData = (await articleRef.get()).data();
    if (articleData?.slug) {
      revalidatePath(`/articles/${articleData.slug}`);
    }

    return { success: true, message: 'Article and image linked successfully.' };
  } catch (error: any) {
    console.error('Failure in linkArticleToImage transaction:', error);
    return { success: false, message: `Failed to link article and image: ${error.message}` };
  }
}
