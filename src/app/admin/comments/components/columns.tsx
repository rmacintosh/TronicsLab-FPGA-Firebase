
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { FullComment } from "@/lib/types";
import { DataTableColumnHeader } from "@/app/admin/components/data-table-column-header";
import { CellAction } from "./cell-action";
import { TruncatedText } from "@/components/ui/truncated-text";
import { DateRange } from "react-day-picker";

export const columns: ColumnDef<FullComment>[] = [
    {
        accessorKey: "comment",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Comment" />
        ),
        cell: ({ row }) => {
            const comment = row.original;
            return <TruncatedText text={comment.comment} title={`Comment by ${comment.authorName}`} />;
        },
        meta: {
            displayName: "Comment",
        }
    },
    {
        accessorKey: "authorName",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Author" />
        ),
        meta: {
            displayName: "Author",
        }
    },
    {
        accessorKey: "articleTitle",
        header: "Article",
        meta: {
            displayName: "Article",
        }
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Creation Date" />
        ),
        cell: ({ row }) => {
            const date = new Date(row.original.createdAt);
            return <div>{date.toLocaleDateString()}</div>;
        },
        filterFn: (row, id, value: DateRange) => {
            const date = new Date(row.getValue(id));
            if (value.from && value.to) {
                return date >= value.from && date <= value.to;
            }
            if (value.from) {
                return date >= value.from;
            }
            if (value.to) {
                return date <= value.to;
            }
            return true;
        },
        meta: {
            displayName: "Creation Date",
        }
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }: { row: any }) => <CellAction data={row.original} />,
    },
];
