
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/lib/server-types";
import { CellAction } from "./cell-action";

export const columns: ColumnDef<User>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "roles",
        header: "Roles",
        cell: ({ row }) => {
            const roles = row.original.roles || [];
            return <div>{roles.join(", ")}</div>;
        },
    },
    {
        id: "actions",
        cell: ({ row }: { row: any }) => <CellAction data={row.original} />,
    },
];
