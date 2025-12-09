
import { firestore } from "firebase-admin";

// These types are intended for server-side use only.
// They are kept separate to avoid bundling server-only code with client components.

// Define the roles as a constant array. This is the single source of truth.
export const USER_ROLES = ['admin', 'author', 'moderator', 'user'] as const;

// Derive the UserRole type from the USER_ROLES constant.
export type UserRole = typeof USER_ROLES[number];

export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string; 
  categorySlug: string;
  authorId: string; 
  authorName: string;
  date: string;
  views: number;
  image: {
    id: string;
    imageHint: string;
    originalUrl: string; // The canonical, full-resolution URL for the image.
    largeUrl?: string;    // Optional URL for a large-sized version.
    mediumUrl?: string;   // Optional URL for a medium-sized version.
    thumbUrl?: string;    // Optional URL for a thumbnail version.
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
  articleCount?: number;
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
  createdAt: string;
}
