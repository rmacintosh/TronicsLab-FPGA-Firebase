'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase/provider';
import { getAllArticlesAction } from '@/lib/actions/article.actions';
import { Article } from '@/lib/types';
import { getColumns } from './components/columns'; // Correctly import getColumns
import { DataTable } from '@/app/admin/components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function ArticlesPage() {
    const { user, isUserLoading } = useFirebase();
    const { toast } = useToast();
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchArticles = useCallback(async () => {
        if (!user) {
            toast({
                variant: "destructive",
                title: "Authentication Error",
                description: "You must be logged in to manage articles.",
            });
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const authToken = await user.getIdToken();
            if (!authToken) {
                throw new Error('Authentication token not available.');
            }
            const result = await getAllArticlesAction(authToken);
            if (result.success && result.articles) {
                setArticles(result.articles);
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed to fetch articles",
                    description: result.message || 'An unknown error occurred.',
                });
            }
        } catch (error: any) {
            console.error('Error fetching articles:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || 'An error occurred while fetching the article list.',
            });
        }
        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        if (!isUserLoading) {
            fetchArticles();
        }
    }, [isUserLoading, fetchArticles]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Manage Articles</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Pass the fetchArticles function to getColumns
    const columns = getColumns(fetchArticles);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Articles</CardTitle>
            </CardHeader>
            <CardContent>
                <DataTable 
                    columns={columns} 
                    data={articles} 
                    searchableColumns={[
                        {
                            id: 'title',
                            placeholder: 'Filter by title...'
                        },
                        {
                            id: 'categoryName',
                            placeholder: 'Filter by category...'
                        },
                        {
                            id: 'authorName',
                            placeholder: 'Filter by author...'
                        }
                    ]}
                />
            </CardContent>
        </Card>
    );
}
