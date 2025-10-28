
import { Article, Comment } from "./server-types";

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
  };
  content: string;
};

export interface FullArticle extends Article {
  categoryName: string;
  authorName: string;
}

export interface FullComment extends Comment {
    articleTitle: string;
    authorName: string;
}
