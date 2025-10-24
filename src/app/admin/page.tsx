
"use client"

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
import { FilePlus, MessageSquare, Users, Database, LayoutGrid, FilePen } from "lucide-react";
import Link from "next/link";
import { useData } from "@/components/providers/data-provider";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { articles, comments, seedDatabase } = useData();
  const { toast } = useToast();

  const handleSeedDatabase = async () => {
    try {
      await seedDatabase();
      toast({
        title: "Database Seeded",
        description: "The initial data has been successfully loaded into Firestore.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Seeding Database",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };
  
  return (
    <div className="space-y-8">
      <h1 className="font-headline text-4xl font-bold tracking-tight">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/articles">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <FilePen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{articles.length}</div>
              <p className="text-xs text-muted-foreground">
                articles published
              </p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comments.length}</div>
            <p className="text-xs text-muted-foreground">
              comments across all articles
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
             <p className="text-xs text-muted-foreground">
              (mock data)
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Perform common administrative tasks.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
            <Button asChild>
                <Link href="/admin/articles/create">
                    <FilePlus className="mr-2 h-4 w-4" /> Create New Article
                </Link>
            </Button>
            <Button asChild variant="secondary">
                <Link href="/admin/articles">
                    <FilePen className="mr-2 h-4 w-4" /> Manage Articles
                </Link>
            </Button>
            <Button asChild variant="secondary">
                <Link href="/admin/comments">
                    <MessageSquare className="mr-2 h-4 w-4" /> Manage Comments
                </Link>
            </Button>
            <Button asChild variant="secondary">
                <Link href="/admin/categories">
                    <LayoutGrid className="mr-2 h-4 w-4" /> Manage Categories
                </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Database className="mr-2 h-4 w-4" /> Seed Database
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all articles and categories from the database and replace them with the initial seed data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSeedDatabase}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
