
import type { Article as ServerArticle, Comment as ServerComment, User, FullComment as ServerFullComment, Category } from "./server-types";

// Redefine the Article type for the client to use category in addition to categoryId
export interface Article extends ServerArticle {
    category: string;
}

export type { User, Category };

// Redefine the Comment and FullComment types for the client to expect a string for createdAt
export interface Comment extends Omit<ServerComment, 'createdAt'> {
  createdAt: string;
}

export interface FullComment extends Omit<ServerFullComment, 'createdAt'> {
  createdAt: string;
}

// This type is used for the form when creating a new article.
// It is intentionally kept in a separate, client-safe file.
export type NewArticleData = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  image: {
    id: string;
    imageUrl: string;
    imageHint: string;
    thumbUrl?: string;
    mediumUrl?: string;
    largeUrl?: string;
  };
  content: string;
};
