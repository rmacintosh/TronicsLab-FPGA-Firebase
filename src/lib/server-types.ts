
// These types are intended for server-side use only.
// They are kept separate to avoid bundling server-only code with client components.

export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  author: string;
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
  userEmail: string;
  comment: string;
  date: string;
}

export interface User {
  email: string;
  name: string;
  avatar: string;
  isAdmin?: boolean;
}
