"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useData } from "@/components/providers/data-provider";

export default function ManageCommentsPage() {
    const { articles, comments } = useData();

    const getArticleTitle = (slug: string) => {
        return articles.find(a => a.slug === slug)?.title || 'Unknown Article';
    }

    return (
        <div className="space-y-8">
            <h1 className="font-headline text-4xl font-bold tracking-tight">Manage Comments</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Comments</CardTitle>
                    <CardDescription>Review and moderate comments from users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Comment</TableHead>
                                <TableHead className="hidden md:table-cell">Article</TableHead>
                                <TableHead className="hidden md:table-cell">Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {comments.map((comment) => (
                                <TableRow key={comment.id}>
                                    <TableCell>
                                        <div className="font-medium">{comment.userEmail.split('@')[0]}</div>
                                        <div className="text-xs text-muted-foreground">{comment.userEmail}</div>
                                    </TableCell>
                                    <TableCell className="max-w-sm truncate">{comment.comment}</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Link href={`/articles/${comment.articleSlug}`} className="hover:underline text-primary">
                                            {getArticleTitle(comment.articleSlug)}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{new Date(comment.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="ghost" size="icon" className="text-green-500 hover:text-green-600">
                                                <Check className="h-4 w-4" />
                                                <span className="sr-only">Approve</span>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80">
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
