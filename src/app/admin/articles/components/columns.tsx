
'use client';

import { ColumnDef, CellContext } from "@tanstack/react-table";
import { Article } from "@/lib/types";
import { CellAction } from "./cell-action";
import { DataTableColumnHeader } from "@/app/admin/components/data-table-column-header";

export const columns: ColumnDef<Article>[] = [
    {
        accessorKey: "title",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Title" className="" />
        ),
        meta: {
            displayName: "Title",
        }
    },
    {
        accessorKey: "category",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Category" className="" />
        ),
        meta: {
            displayName: "Category",
        }
    },
    {
        accessorKey: "authorName",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Author" className="" />
        ),
        meta: {
            displayName: "Author",
        }
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }: CellContext<Article, unknown>) => <CellAction data={row.original} />,
    },
];
