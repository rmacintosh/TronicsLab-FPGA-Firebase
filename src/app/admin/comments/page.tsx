
"use client";

import { useData } from "@/components/providers/data-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/alert-dialog";

export default function CommentsPage() {
  const { comments, userRoles, refreshData, deleteComment } = useData();
  const { toast } = useToast();

  const canModerate = userRoles.includes('admin') || userRoles.includes('moderator');

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteComment(id);
      if (result.success) {
        refreshData();
        toast({
          title: "Success",
          description: "Comment deleted successfully.",
        });
      } else {
        toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments</CardTitle>
        <CardDescription>
          Manage all comments on your articles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comment</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Article</TableHead>
              {canModerate && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.map((comment) => (
              <TableRow key={comment.id}>
                <TableCell className="font-medium">{comment.comment}</TableCell>
                <TableCell>{comment.authorName}</TableCell>
                <TableCell>{comment.articleTitle}</TableCell>
                {canModerate && (
                    <TableCell className="text-right">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            Delete
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the comment.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(comment.id)}>
                            Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
