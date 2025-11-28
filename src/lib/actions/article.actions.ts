'use server';

import { revalidatePath } from 'next/cache';
import { Article, NewArticleData } from '@/lib/types';
import { adminFirestore } from '@/firebase/admin';
import { verifyUser, verifyUserRole } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { deleteArticleAndAssociatedImage } from '@/lib/article-helpers';

/**
 * Creates a new article document in Firestore and updates the category's article count.
 * This function now takes the pre-uploaded imageId and associates it with the new article.
 * @param authToken The user's authentication token.
 * @param articleData The data for the new article, including the imageId.
 * @returns An object indicating success or failure.
 */
export async function processAndCreateArticleAction(
    authToken: string,
    articleData: NewArticleData
): Promise<{ success: boolean; message: string; slug?: string; }> {
    const { hasRole, decodedToken, error } = await verifyUserRole(authToken, ['admin', 'author']);
    if (!hasRole || !decodedToken) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    try {
        const articleRef = adminFirestore.collection('articles').doc();
        const categoryRef = adminFirestore.collection('categories').doc(articleData.categoryId);
        const imageRef = adminFirestore.collection('images').doc(articleData.image.id);

        const newArticle: Omit<Article, 'id' | 'date' | 'views'> = {
            slug: articleData.slug,
            title: articleData.title,
            description: articleData.description,
            content: articleData.content,
            authorId: decodedToken.uid,
            authorName: decodedToken.name || 'Anonymous Author',
            categoryId: articleData.categoryId,
            categoryName: '', // This will be filled in by the transaction
            categorySlug: '', // This will be filled in by the transaction
            image: {
                id: articleData.image.id,
                imageHint: articleData.image.imageHint,
                imageUrl: '', // Will be populated by linkArticleToImage
            },
        };

        await adminFirestore.runTransaction(async (transaction) => {
            const categoryDoc = await transaction.get(categoryRef);
            if (!categoryDoc.exists) {
                throw new Error('Category not found.');
            }
            const categoryData = categoryDoc.data();

            // Set the final article data within the transaction
            const finalArticleData = {
                ...newArticle,
                id: articleRef.id,
                date: new Date().toISOString(),
                views: 0,
                categoryName: categoryData?.name || 'Uncategorized',
                categorySlug: categoryData?.slug || 'uncategorized',
            };

            transaction.set(articleRef, finalArticleData);
            transaction.update(categoryRef, { articleCount: FieldValue.increment(1) });

            // Update the image document with the image hint.
            transaction.set(imageRef, { imageHint: articleData.image.imageHint }, { merge: true });
        });

        revalidatePath('/admin/articles');
        revalidatePath('/');
        
        return {
            success: true,
            message: 'Article created successfully! Image is now processing.',
            slug: articleData.slug,
        };

    } catch (error: any) {
        return { success: false, message: `Error creating article: ${error.message}` };
    }
}


function sanitizeArticleForUpdate(data: Partial<Article>): any {
  const sanitized: Partial<Article> = {};
  if (data.title !== undefined) sanitized.title = data.title;
  if (data.description !== undefined) sanitized.description = data.description;
  if (data.content !== undefined) sanitized.content = data.content;
  if (data.slug !== undefined) sanitized.slug = data.slug;
  if (data.categoryId !== undefined) sanitized.categoryId = data.categoryId;
  if (data.image !== undefined) sanitized.image = data.image; // Allow image updates
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

      // Handle category change
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

      // Handle image hint update on an existing image
      if (payloadToUpdate.image && !payloadToUpdate.image.imageUrl) {
        const imageRef = adminFirestore.collection('images').doc(payloadToUpdate.image.id);
        transaction.set(imageRef, { imageHint: payloadToUpdate.image.imageHint }, { merge: true });
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
