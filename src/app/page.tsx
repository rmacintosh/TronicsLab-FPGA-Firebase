'use client'

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/components/providers/data-provider";
import Link from "next/link";
import { ArrowRight, Rss } from "lucide-react";
import DynamicIcon from "@/components/dynamic-icon";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function Home() {
  const { categories, articles, isLoading } = useData();
  const topLevelCategories = categories.filter((c) => c.parentId === null);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
        <Breadcrumbs categories={categories} articles={articles} />

        <header className="text-center space-y-2">
            <h1 className="font-headline text-4xl font-bold tracking-tight lg:text-5xl">Explore Our Content</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Dive into a wealth of knowledge, organized into clear, easy-to-navigate categories. Find what you need to accelerate your learning and development.
            </p>
        </header>

        <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {topLevelCategories.map((category) => (
                    <Link key={category.id} href={`/categories/${category.slug}`} className="block group">
                        <Card className="h-full flex flex-col items-center justify-center text-center p-6 transition-all duration-300 ease-in-out hover:bg-muted/50 hover:shadow-lg hover:-translate-y-1">
                            <div className="mb-4 p-4 bg-primary/10 rounded-full text-primary">
                                <DynamicIcon name={category.icon || 'HelpCircle'} className="size-10 transition-transform duration-300 group-hover:scale-110" />
                            </div>
                            <CardHeader className="p-0">
                                <CardTitle className="font-headline text-xl mb-1">{category.name}</CardTitle>
                                <CardDescription className="text-sm">{category.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </section>

        <section className="text-center mt-12">
            <h2 className="font-headline text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">Subscribe to our RSS feed to get the latest articles as soon as they are published.</p>
            <Link href="/rss.xml" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90">
                <Rss className="mr-2 -ml-1 size-5" />
                Subscribe to RSS
            </Link>
        </section>
    </div>
  );
}
