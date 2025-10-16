import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { articles, comments } from "@/lib/data";
import { FilePlus, MessageSquare, Users } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <h1 className="font-headline text-4xl font-bold tracking-tight">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <FilePlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{articles.length}</div>
            <p className="text-xs text-muted-foreground">
              articles published
            </p>
          </CardContent>
        </Card>
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
                <Link href="/admin/create">
                    <FilePlus className="mr-2 h-4 w-4" /> Create New Article
                </Link>
            </Button>
            <Button asChild variant="secondary">
                <Link href="/admin/comments">
                    <MessageSquare className="mr-2 h-4 w-4" /> Manage Comments
                </Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
