"use client";

import { useData } from "@/components/providers/data-provider";
import { CategoryCard } from "@/components/ui/category-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Article, Category } from "@/lib/types";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

interface HomeClientProps {
  categories: Category[];
  articles: Article[];
}

export function HomeClient({ categories, articles }: HomeClientProps) {
  const { isLoading } = useData();
  const topLevelCategories = categories.filter((c) => c.parentId === null);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Top-Level Categories</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {topLevelCategories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>

      <h1 className="text-3xl font-bold mb-4">Recent Articles</h1>
      <div className="space-y-4">
        {articles.map((article) => (
          <div key={article.id} className="p-4 border rounded-lg">
            <h2 className="text-2xl font-semibold">{article.title}</h2>
            <Breadcrumbs articles={[article]} categories={categories} />
            <p className="text-gray-600 mt-2">{article.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}