// This type is used for the form when creating a new article.
// It is intentionally kept in a separate, client-safe file.
export type NewArticleData = {
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
