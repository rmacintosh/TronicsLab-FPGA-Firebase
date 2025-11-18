
"use client";

import { useData } from "@/components/providers/data-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { columns } from "./components/columns";
import { DataTable } from "../components/data-table";

export default function CommentsPage() {
  const { comments } = useData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments</CardTitle>
        <CardDescription>
          Manage all comments on your articles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          data={comments} 
          dateRangeColumns={[
            { id: "createdAt" },
          ]}
          searchableColumns={[
            {
              id: 'authorName',
              placeholder: 'Filter by author...'
            },
            {
              id: 'articleTitle',
              placeholder: 'Filter by article...'
            }
          ]}
        />
      </CardContent>
    </Card>
  );
}
