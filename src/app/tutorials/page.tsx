import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { articles } from "@/lib/data";
import { ArrowRight, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function TutorialsPage() {
  const tutorialArticles = articles.filter(a => a.category === 'tutorials');

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-headline text-4xl font-bold tracking-tight">Tutorials</h1>
        <p className="text-lg text-muted-foreground">
          Step-by-step guides to help you master FPGA development and digital electronics.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tutorialArticles.map((article) => (
          <Card key={article.slug} className="flex flex-col overflow-hidden">
            <CardHeader className="p-0">
              <Link href={`/articles/${article.slug}`} className="block">
                <Image
                  src={article.image.imageUrl}
                  alt={article.title}
                  width={600}
                  height={400}
                  className="aspect-video w-full object-cover"
                  data-ai-hint={article.image.imageHint}
                />
              </Link>
            </CardHeader>
            <CardContent className="flex-grow p-6">
              <CardTitle className="font-headline text-xl mb-2">
                <Link href={`/articles/${article.slug}`} className="hover:text-primary transition-colors">{article.title}</Link>
              </CardTitle>
              <CardDescription>{article.description}</CardDescription>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-6 pt-0">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Eye className="size-4" />
                    <span>{article.views.toLocaleString()} views</span>
                </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/articles/${article.slug}`}>
                  Read More <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
