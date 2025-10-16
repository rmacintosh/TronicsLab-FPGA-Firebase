export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
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
