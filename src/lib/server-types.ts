
// These types are intended for server-side use only.
// They are kept separate to avoid bundling server-only code with client components.

export type UserRole = 'admin' | 'author' | 'moderator' | 'user';

export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  authorId: string; // Changed from author
  date: string;
  views: number;
  image: {
    id: string;
    imageUrl: string;
    imageHint: string;
  };
  content: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
}

export interface Comment {
  id: string;
  articleSlug: string;
  userId: string; // Added userId
  userEmail: string;
  comment: string;
  date: string;
}

export interface User {
  uid: string;
  email: string;
  name: string;
  avatar: string;
  roles: UserRole[];
}
