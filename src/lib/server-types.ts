
import { firestore } from "firebase-admin";

// These types are intended for server-side use only.
// They are kept separate to avoid bundling server-only code with client components.

export type UserRole = 'admin' | 'author' | 'moderator' | 'user';

export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  authorId: string; 
  authorName: string;
  date: string;
  views: number;
  image: {
    id: string;
    imageUrl: string;
    imageHint: string;
    thumbUrl?: string;
    mediumUrl?: string;
    largeUrl?: string;
  };
  content: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId: string | null;
  description: string;
}

export interface Comment {
  id: string;
  articleId: string;
  userId: string;
  comment: string;
  createdAt: firestore.Timestamp;
  authorName: string;
  authorPhotoURL?: string;
}

export interface FullComment extends Comment {
  articleTitle: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  roles: UserRole[];
}
  