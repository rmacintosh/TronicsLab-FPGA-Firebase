import { getAllArticles, getAllCategories } from "@/lib/server-actions";
import { HomeClient } from "./HomeClient";
import { Article } from "@/lib/types";

export default async function Home() {
  const serverArticles = await getAllArticles();
  const categories = await getAllCategories();

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const articles: Article[] = serverArticles.map((article) => ({
    ...article,
    category: categoryMap.get(article.categoryId) || "Unknown Category",
  }));

  return <HomeClient categories={categories} articles={articles} />;
}
