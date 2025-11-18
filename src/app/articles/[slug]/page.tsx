import { getArticleBySlug, getCommentsByArticleId, getCategoryById } from '@/lib/server-actions';
import { ArticleClient } from './ArticleClient';
import { notFound } from 'next/navigation';
import { Article } from '@/lib/types';

type PageProps = {
  params: Promise<{ slug: string }>;
};

// This is now a Server Component. It fetches data on the server and passes it
// to the client component.
export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch article data on the server.
  const article = await getArticleBySlug(slug);

  // If no article is found, render the 404 page.
  if (!article) {
    notFound();
  }

  // Fetch category data to transform the article object for the client.
  const category = await getCategoryById(article.categoryId);

  // Fetch comments data on the server.
  const comments = await getCommentsByArticleId(article.id);

  // Create the client-safe article object.
  const clientArticle: Article = {
    ...article,
    category: category?.name || 'Uncategorized',
  };

  // Render the client component with the fetched data.
  return (
    <ArticleClient
      initialArticle={clientArticle}
      initialComments={comments}
    />
  );
}
