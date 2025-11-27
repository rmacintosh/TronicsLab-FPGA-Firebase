'use client'

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { getAllUsersAction } from '@/lib/actions/user.actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus, MessageSquare, Users, Database, LayoutGrid, FilePen, Loader2 } from "lucide-react";
import Link from "next/link";
import { useData } from "@/components/providers/data-provider";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { articles, comments, seedDatabase } = useData();
  const { user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [userCount, setUserCount] = useState(0);
  const [isUserCountLoading, setUserCountLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) return; 

    const fetchUserCount = async () => {
        if (!user) { 
            setUserCountLoading(false);
            return; 
        }

        try {
            const authToken = await user.getIdToken();
            if (!authToken) {
                throw new Error('Authentication token not available.');
            }
            const result = await getAllUsersAction(authToken);
            if (result.success && result.users) {
                setUserCount(result.users.length);
            } else {
                console.error('Failed to fetch users:', result.message);
            }
        } catch (error) {
            console.error('Error fetching user count:', error);
        } finally {
            setUserCountLoading(false);
        }
    };

    fetchUserCount();
}, [user, isUserLoading]);

  const handleSeedDatabase = async () => {
    try {
      await seedDatabase();
      toast({
        title: "Database Seeded",
        description: "The initial data has been successfully loaded into Firestore.",
      });
    } catch (error: any) {
      // CORRECTED LOGGING: Log the full error to the browser console
      console.error("--- CLIENT-SIDE SEEDING ERROR ---", error);
      toast({
        variant: "destructive",
        title: "Error Seeding Database",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isUserCountLoading ? (
                        <div className="flex items-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                        </div>
                    ) : (
                        <div className="text-2xl font-bold">{userCount}</div>
                    )}
                    <p className="text-xs text-muted-foreground">Total users in the system</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
                    <FilePen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{articles.length}</div>
                    <p className="text-xs text-muted-foreground">Total articles published</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{comments.length}</div>
                    <p className="text-xs text-muted-foreground">Total comments across all articles</p>
                </CardContent>
            </Card>
        </div>
        <div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Manage Content</CardTitle>
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex space-x-2">
                        <Button asChild size="sm">
                            <Link href="/admin/articles/new">New Article <FilePlus className='w-4 h-4 ml-2'/></Link>
                        </Button>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">Seed Database <Database className='w-4 h-4 ml-2'/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will seed the database with sample articles and comments. This action should only be performed once.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSeedDatabase}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Create new articles or seed the database.</p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}