"use client"

import { useUser } from "@/firebase";
import { useData } from "@/components/providers/data-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Article } from "@/lib/types";

export default function ProfilePage() {
    const { user, isUserLoading } = useUser();
    const { comments, articles } = useData();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    if (isUserLoading || !user) {
        return <div>Loading...</div>; // Or a spinner component
    }

    const userComments = comments.filter(comment => comment.userId === user.uid);
    
    const articleMap = new Map<string, Article>(articles.map(a => [a.id, a]));

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-3xl">{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="font-headline text-4xl font-bold tracking-tight">{user.displayName || user.email?.split('@')[0]}</h1>
                    <p className="text-muted-foreground">{user.email}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>My Comments</CardTitle>
                    <CardDescription>You have made {userComments.length} comments.</CardDescription>
                </CardHeader>
                <CardContent>
                    {userComments.length > 0 ? (
                        <div className="space-y-6">
                            {userComments.map(comment => {
                                const article = articleMap.get(comment.articleId);
                                return (
                                    <div key={comment.id} className="p-4 border rounded-lg bg-card">
                                        <p className="text-muted-foreground">{comment.comment}</p>
                                        <div className="text-xs text-muted-foreground mt-2">
                                            Commented on 
                                            {article ? (
                                                <Link href={`/articles/${article.slug}`} className="font-medium text-primary hover:underline ml-1">
                                                    {comment.articleTitle}
                                                </Link>
                                            ) : (
                                                <span className="font-medium text-primary ml-1">{comment.articleTitle}</span>
                                            )}
                                            <span className="mx-1">&middot;</span>
                                            {comment.createdAt && new Date(comment.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground mb-4">You haven't posted any comments yet.</p>
                            <Button asChild>
                                <Link href="/">
                                    Explore Articles <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
