'use server';

import { adminFirestore } from '@/firebase/admin';
import { Article, Comment, User, FullComment, Category } from './server-types';
import { firestore } from 'firebase-admin';
import { getCategoryById as getCategoryByIdAction } from './actions/category.actions';

// Helper to convert Timestamp to ISO string for a comment object
const toSerializableFullComment = (comment: Comment, articleTitle: string): Omit<FullComment, 'createdAt'> & { createdAt: string } => {
    const { createdAt, ...rest } = comment;
    return {
        ...rest,
        createdAt: (createdAt as firestore.Timestamp).toDate().toISOString(),
        articleTitle,
    };
};

/**
 * Fetches a single article from Firestore by its slug.
 * @param slug The slug of the article to fetch.
 * @returns The article data or null if not found.
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articlesRef = adminFirestore.collection('articles');
  const snapshot = await articlesRef.where('slug', '==', slug).limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Article;
}

/**
 * Fetches a single category from Firestore by its ID.
 * @param id The ID of the category to fetch.
 * @returns The category data or null if not found.
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  return getCategoryByIdAction(id);
}

/**
 * Fetches all comments for a given article ID, including author details.
 * @param articleId The ID of the article.
 * @returns An array of enriched comments with author data, safe for client components.
 */
export async function getCommentsByArticleId(articleId: string): Promise<any[]> {
  const commentsRef = adminFirestore.collection('comments');
  const commentsSnapshot = await commentsRef.where('articleId', '==', articleId).orderBy('createdAt', 'desc').get();

  if (commentsSnapshot.empty) {
    return [];
  }
  
  const articleRef = adminFirestore.collection('articles').doc(articleId);
  const articleSnap = await articleRef.get();
  const article = articleSnap.data() as Article | undefined;
  const articleTitle = article?.title || 'Unknown Article';

  const comments = commentsSnapshot.docs.map(doc => {
      const comment = { id: doc.id, ...doc.data() } as Comment;
      return toSerializableFullComment(comment, articleTitle);
  });

  return comments;
}

/**
 * Adds a new comment to an article.
 * @param articleId The ID of the article to comment on.
 * @param userId The ID of the user posting the comment.
 * @param commentText The text of the comment.
 * @returns The newly created comment with author data, safe for client components.
 */
export async function addComment(articleId: string, userId: string, commentText: string): Promise<any> {
    const userRef = adminFirestore.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const user = userSnap.data() as User | undefined;

    const commentData = {
        articleId,
        userId,
        comment: commentText,
        createdAt: firestore.FieldValue.serverTimestamp(),
        authorName: user?.displayName || 'Anonymous',
        authorPhotoURL: user?.photoURL || undefined,
    };

    const newCommentRef = await adminFirestore.collection('comments').add(commentData);
    const newCommentSnap = await newCommentRef.get();
    const newComment = { id: newCommentSnap.id, ...newCommentSnap.data() } as Comment;

    const articleRef = adminFirestore.collection('articles').doc(articleId);
    const articleSnap = await articleRef.get();
    const article = articleSnap.data() as Article | undefined;
    const articleTitle = article?.title || 'Unknown Article';

    return toSerializableFullComment(newComment, articleTitle);
}

/**
 * Fetches all articles from Firestore.
 * @returns An array of all articles.
 */
export async function getAllArticles(): Promise<Article[]> {
  const articlesRef = adminFirestore.collection('articles');
  const snapshot = await articlesRef.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Article[];
}

/**
 * Fetches all categories from Firestore.
 * @returns An array of all categories.
 */
export async function getAllCategories(): Promise<Category[]> {
  const categoriesRef = adminFirestore.collection('categories');
  const snapshot = await categoriesRef.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
}
