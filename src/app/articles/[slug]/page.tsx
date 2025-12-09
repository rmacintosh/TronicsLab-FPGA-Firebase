import { getArticleBySlug, getCommentsByArticleId } from '@/lib/server-actions';
import { ArticleClient } from './ArticleClient';
import { notFound } from 'next/navigation';
import { getHighlightedHtml } from '@/lib/content-utils';

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

  // Process the content on the server to apply syntax highlighting.
  const highlightedContent = await getHighlightedHtml(article.content);

  // Fetch comments data on the server.
  const comments = await getCommentsByArticleId(article.id);

  // Create a new article object with the highlighted content to pass to the client.
  const articleForClient = {
      ...article,
      content: highlightedContent,
  };

  // Render the client component with the fetched and processed data.
  return (
    <ArticleClient
      initialArticle={articleForClient}
      initialComments={comments}
    />
  );
}
