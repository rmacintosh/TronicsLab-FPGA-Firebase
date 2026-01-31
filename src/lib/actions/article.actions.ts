'use server';

import { revalidatePath } from 'next/cache';
import { Article, NewArticleData } from '@/lib/types';
import { adminFirestore } from '@/firebase/admin';
import { verifyUser, verifyUserRole } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { deleteArticleAndAssociatedImage } from '@/lib/article-helpers';

export async function processAndCreateArticleAction(
    authToken: string,
    articleData: NewArticleData
): Promise<{ success: boolean; message: string; slug?: string; }> {
    const { hasRole, decodedToken, error } = await verifyUserRole(authToken, ['admin', 'author']);
    if (!hasRole || !decodedToken) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    try {
        const articleRef = articleData.id
            ? adminFirestore.collection('articles').doc(articleData.id)
            : adminFirestore.collection('articles').doc();

        const categoryRef = adminFirestore.collection('categories').doc(articleData.categoryId);
        const imageRef = adminFirestore.collection('images').doc(articleData.image.id);
        const userRef = adminFirestore.collection('users').doc(decodedToken.uid);

        await adminFirestore.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error('User not found in database.');
            }
            const userData = userDoc.data();
            const authorName = userData?.displayName || 'Anonymous Author';

            const categoryDoc = await transaction.get(categoryRef);
            if (!categoryDoc.exists) {
                throw new Error('Category not found.');
            }
            const categoryData = categoryDoc.data();

            const finalArticleData: Article = {
                id: articleRef.id,
                date: new Date().toISOString(),
                views: 0,
                slug: articleData.slug,
                title: articleData.title,
                description: articleData.description,
                content: articleData.content,
                authorId: decodedToken.uid,
                authorName: authorName,
                categoryId: articleData.categoryId,
                categoryName: categoryData?.name || 'Uncategorized',
                categorySlug: categoryData?.slug || 'uncategorized',
                image: {
                    id: articleData.image.id,
                    imageHint: articleData.image.imageHint,
                    originalUrl: '', // Will be populated by a background process
                },
            };

            transaction.set(articleRef, finalArticleData);
            transaction.update(categoryRef, { articleCount: FieldValue.increment(1) });

            transaction.set(imageRef, { imageHint: articleData.image.imageHint, articleId: articleRef.id, isFeatureImage: true }, { merge: true });
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


export async function updateArticleAction(
  authToken: string,
  articleId: string,
  articleData: Partial<Article>
): Promise<{ success: boolean; message: string; slug?: string }> {
  const { hasRole, decodedToken, error: authError } = await verifyUserRole(authToken, ['admin', 'author']);
  if (!hasRole || !decodedToken) {
    return { success: false, message: authError || 'Authorization failed.' };
  }

  const isAdmin = (decodedToken as any).roles?.includes('admin') ?? false;
  
  try {
    const articleRef = adminFirestore.collection('articles').doc(articleId);
    let slugForRevalidation: string | undefined;

    await adminFirestore.runTransaction(async (transaction) => {
      const articleSnap = await transaction.get(articleRef);
      if (!articleSnap.exists) {
        throw new Error('Article not found.');
      }
      const currentArticleData = articleSnap.data() as Article;
      slugForRevalidation = currentArticleData.slug;
      
      if (!isAdmin && currentArticleData.authorId !== decodedToken.uid) {
        throw new Error('Permission denied. Authors can only edit their own articles.');
      }

      const payload: { [key: string]: any } = {};
      if (articleData.description !== undefined) payload.description = articleData.description;
      if (articleData.content !== undefined) payload.content = articleData.content;

      if (isAdmin) {
          if (articleData.title !== undefined) payload.title = articleData.title;
          if (articleData.categoryId !== undefined) payload.categoryId = articleData.categoryId;
      }

      if (isAdmin && payload.categoryId && payload.categoryId !== currentArticleData.categoryId) {
        const newCategoryRef = adminFirestore.collection('categories').doc(payload.categoryId);
        const oldCategoryRef = adminFirestore.collection('categories').doc(currentArticleData.categoryId);
        
        const newCategorySnap = await transaction.get(newCategoryRef);
        if (!newCategorySnap.exists) throw new Error('New category not found.');

        payload.categoryName = newCategorySnap.data()?.name;
        payload.categorySlug = newCategorySnap.data()?.slug;
        
        transaction.update(newCategoryRef, { articleCount: FieldValue.increment(1) });
        transaction.update(oldCategoryRef, { articleCount: FieldValue.increment(-1) });
      }

      const currentImage = currentArticleData.image;
      const newImage = articleData.image;

      if (newImage && newImage.id !== currentImage?.id) {
        payload.image = {
          id: newImage.id,
          imageHint: newImage.imageHint || '',
          originalUrl: '', 
        };
        const newImageRef = adminFirestore.collection('images').doc(newImage.id);
        transaction.set(newImageRef, { 
            imageHint: newImage.imageHint || '',
            articleId: articleId,
            isFeatureImage: true 
        }, { merge: true });

      } else if (newImage === null && currentImage !== null) {
        payload.image = null;
      } else if (newImage && newImage.id === currentImage?.id && newImage.imageHint !== currentImage?.imageHint) {
        payload['image.imageHint'] = newImage.imageHint || '';
        const imageRef = adminFirestore.collection('images').doc(newImage.id);
        transaction.update(imageRef, { imageHint: newImage.imageHint || '' });
      }
      
      if (Object.keys(payload).length > 0) {
        transaction.update(articleRef, payload);
      }
    });

    revalidatePath('/admin/articles');
    const finalSlug = (isAdmin && articleData.slug) ? articleData.slug : slugForRevalidation;
    if (finalSlug) {
      revalidatePath(`/articles/${finalSlug}`);
    }

    return {
      success: true,
      message: 'Article updated successfully!',
      slug: finalSlug,
    };
  } catch (error: any) {
    return { success: false, message: `Error updating article: ${error.message}` };
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
      const articleData = articleDoc.data() as Article;

      const articleUpdatePayload: { [key: string]: any } = {};

      if (imageUrls.content) {
          const oldUrl = imageUrls.content.replace('images/content/', 'images/temp/');
          const newContent = articleData.content.replace(oldUrl, imageUrls.content);
          articleUpdatePayload['content'] = newContent;
      } else {
        for (const [key, value] of Object.entries(imageUrls)) {
            if (value) {
              articleUpdatePayload[`image.${key}`] = value;
            }
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
