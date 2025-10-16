"use client"

import { user } from "@/lib/data";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, GitBranch, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CodeBlock } from "@/components/code-block";
import { useData } from "@/components/providers/data-provider";
import { use } from "react";

export default function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { articles, comments } = useData();
  const article = articles.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }
  
  const articleComments = comments.filter(c => c.articleSlug === article.slug);
  const author = user;

  return (
    <div className="max-w-4xl mx-auto">
      <article className="space-y-8">
        <header className="space-y-4">
          <Badge variant="outline" className="text-sm">{article.subCategory}</Badge>
          <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">{article.title}</h1>
          <p className="text-lg text-muted-foreground">{article.description}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={author.avatar} />
                <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>{author.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{article.views.toLocaleString()} views</span>
            </div>
            <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>{articleComments.length} comments</span>
            </div>
          </div>
        </header>

        <Image
          src={article.image.imageUrl}
          alt={article.title}
          width={1200}
          height={600}
          className="aspect-video w-full rounded-lg object-cover border"
          data-ai-hint={article.image.imageHint}
          priority
        />

        <div className="prose prose-lg dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
        
        <CodeBlock code={
`module led_blinker(
    input clk,
    output reg led
);

reg [26:0] counter;

always @(posedge clk) begin
    counter <= counter + 1;
    if (counter == 25000000) begin
        led <= ~led;
        counter <= 0;
    end
end

endmodule
`} language="verilog" />
        
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-8 text-center">
            <div className="space-y-4">
                <h3 className="font-headline text-2xl font-semibold">View Full Project on GitHub</h3>
                <p className="text-muted-foreground">Access the complete source code, documentation, and project files.</p>
                <Button asChild>
                    <Link href="#" target="_blank" rel="noopener noreferrer">
                        <GitBranch className="mr-2 h-4 w-4" />
                        Go to GitHub Repository
                    </Link>
                </Button>
            </div>
        </div>
      </article>

      <section className="mt-16 border-t pt-12">
        <h2 className="font-headline text-3xl font-semibold mb-8">Comments ({articleComments.length})</h2>
        <div className="space-y-8">
            {articleComments.map((comment, index) => (
                <div key={index} className="flex gap-4">
                    <Avatar>
                        <AvatarFallback>{comment.userEmail.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold">{comment.userEmail.split('@')[0]}</p>
                            <p className="text-xs text-muted-foreground">{new Date(comment.date).toLocaleDateString()}</p>
                        </div>
                        <p className="text-muted-foreground mt-1">{comment.comment}</p>
                    </div>
                </div>
            ))}
        </div>

        <Card className="mt-12">
            <CardHeader>
                <CardTitle>Leave a Comment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="comment-name">Name</Label>
                        <Input id="comment-name" placeholder="Your Name" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="comment-email">Email</Label>
                        <Input id="comment-email" type="email" placeholder="you@example.com" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="comment-text">Comment</Label>
                    <Textarea id="comment-text" placeholder="Write your comment here..." rows={4} />
                </div>
            </CardContent>
            <CardFooter>
                <Button>Post Comment</Button>
            </CardFooter>
        </Card>
      </section>
    </div>
  );
}
