'use client'

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/components/providers/data-provider";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const { categories, isLoading } = useData();
  const topLevelCategories = categories.filter((c) => c.parentId === null);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-headline text-4xl font-bold tracking-tight lg:text-5xl">Explore Topics</h1>
        <p className="text-lg text-muted-foreground">
          Browse our collection of articles and tutorials organized by category.
        </p>
      </header>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topLevelCategories.map((category) => (
            <Link key={category.id} href={`/categories/${category.slug}`} className="block hover:scale-105 transition-transform duration-200">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-grow">
                  <CardTitle className="font-headline text-xl mb-2">{category.name}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <div className="p-6 pt-0 flex items-center font-medium text-primary">
                  View Articles <ArrowRight className="ml-2 size-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
