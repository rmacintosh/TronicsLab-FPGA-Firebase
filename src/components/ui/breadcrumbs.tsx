'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { Article, Category } from "@/lib/server-types";

type BreadcrumbProps = {
  articles: Article[];
  categories: Category[];
  nameMap?: Record<string, string>;
  basePath?: string;
  rootName?: string;
  rootHref?: string;
};

export function Breadcrumbs({ 
  articles = [],
  categories = [],
  nameMap = {}, 
  basePath = "", 
  rootName = "Home", 
  rootHref 
}: BreadcrumbProps) {
  const pathname = usePathname();

  const getCategoryPath = (categoryId: string | null): Category[] => {
    if (!categoryId) return [];
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return [];
    return [...getCategoryPath(cat.parentId), cat];
  };

  const renderArticlePath = () => {
    const slug = pathname.split('/').pop() || '';
    const article = articles.find(a => a.slug === slug);
    if (!article) return null;

    const categoryPath = getCategoryPath(article.categoryId);
    
    return (
      <>
        {categoryPath.map((cat, index) => (
          <Fragment key={cat.id}>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="font-medium text-muted-foreground">{cat.name}</span>
          </Fragment>
        ))}
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-semibold text-foreground">{article.title}</span>
      </>
    );
  };

  const renderDefaultPath = () => {
    const relativePathname = pathname.startsWith(basePath) ? pathname.substring(basePath.length) : pathname;
    const segments = relativePathname.split('/').filter(Boolean);
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    return (
      <>
        {segments.map((segment, index) => {
          const href = `${basePath}/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          const displayName = nameMap[segment] || segment.replace(/-/g, ' ').split(' ').map(capitalize).join(' ');

          return (
            <Fragment key={href}>
              <ChevronRight className="h-4 w-4 mx-1" />
              {isLast ? (
                <span className="font-semibold text-foreground">{displayName}</span>
              ) : (
                <Link href={href} className="hover:text-foreground transition-colors">
                  {displayName}
                </Link>
              )}
            </Fragment>
          );
        })}
      </>
    )
  }

  const finalRootHref = rootHref || basePath || "/";
  const isArticlePage = pathname.includes('/articles/') && articles.some(a => pathname.endsWith(a.slug));

  return (
    <nav className="flex items-center text-sm font-medium text-muted-foreground">
      <Link href={finalRootHref} className="hover:text-foreground transition-colors">
        {rootName}
      </Link>

      {isArticlePage ? renderArticlePath() : renderDefaultPath()}
    </nav>
  );
}
