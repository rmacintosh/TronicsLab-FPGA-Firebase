
import type { Article as ServerArticle, Comment as ServerComment, User, FullComment as ServerFullComment, Category } from "./server-types";

// The client-side Article is now a direct alias of the server-side Article.
// It includes all fields, including the denormalized categoryName and categorySlug.
export type Article = ServerArticle;

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
    fileName?: string; // The name of the original file, needed for server processing
  };
  content: string;
};
