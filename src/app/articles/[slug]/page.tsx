
"use client"

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
import { useData } from "@/components/providers/data-provider";
import { use, useState, useEffect } from "react";
import { useUser, addDocumentNonBlocking, useFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { getHighlightedHtml } from "@/app/actions";

export default function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { articles, comments, categories } = useData();
  const article = articles.find((a) => a.slug === slug);
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [highlightedContent, setHighlightedContent] = useState(article?.content || "");

  useEffect(() => {
    if (article?.content) {
      getHighlightedHtml(article.content).then(setHighlightedContent);
    }
  }, [article?.content]);

  if (!article) {
    notFound();
  }

  const category = categories.find(c => c.slug === article.category);
  const articleComments = comments.filter(c => c.articleSlug === article.slug);
  const author = {
      name: article.author,
      avatar: `https://picsum.photos/seed/${article.author}/100/100`
  }

  const handlePostComment = () => {
    if (!user || !firestore) {
        toast({
            variant: "destructive",
            title: "Not Logged In",
            description: "You must be logged in to post a comment.",
        });
        return;
    }

    if (!commentText.trim()) {
        toast({
            variant: "destructive",
            title: "Empty Comment",
            description: "You cannot post an empty comment.",
        });
        return;
    }
    
    const commentsCollection = collection(firestore, 'comments');
    addDocumentNonBlocking(commentsCollection, {
        articleSlug: article.slug,
        userEmail: user.email,
        comment: commentText,
        date: new Date().toISOString(),
    });

    setCommentText("");
    toast({
        title: "Comment Posted",
        description: "Your comment has been successfully posted.",
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <article className="space-y-8">
        <header className="space-y-4">
          <Badge variant="outline" className="text-sm">{category?.name}</Badge>
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

        <div className="prose prose-lg dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: highlightedContent }} />
        
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
            {articleComments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
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
                {!user ? (
                     <div className="text-center text-muted-foreground">
                        <Link href="/login" className="underline text-primary">Login</Link> or <Link href="/signup" className="underline text-primary">Sign up</Link> to leave a comment.
      </div>
                ) : (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="comment-text">Your Comment</Label>
                        <Textarea id="comment-text" placeholder="Write your comment here..." rows={4} value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                    </div>
                </>
                )}
            </CardContent>
            {user && (
                <CardFooter>
                    <Button onClick={handlePostComment}>Post Comment</Button>
                </CardFooter>
            )}
        </Card>
      </section>
    </div>
  );
}
