
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/lib/server-types";
import { CellAction } from "./cell-action";
import { DataTableColumnHeader } from "@/app/admin/components/data-table-column-header";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<User>[] = [
    {
        accessorKey: "displayName",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Name" />
        ),
        meta: {
            displayName: "Name",
        }
    },
    {
        accessorKey: "email",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Email" />
        ),
        meta: {
            displayName: "Email",
        }
    },
    {
        accessorKey: "roles",
        header: "Role",
        cell: ({ row }) => {
            const roles = row.original.roles || [];
            // Since we enforce a single role, we can safely take the first one.
            const role = roles[0] || 'user';
            return <Badge variant="outline" className="capitalize">{role}</Badge>;
        },
        filterFn: (row, id, value) => {
            const userRoles = (row.getValue(id) as string[]) || [];
            const selectedRoles = value as string[];
            if (!userRoles || userRoles.length === 0 || selectedRoles.length === 0) return false;
            // Check if any of the user's roles are in the selected filter roles.
            return selectedRoles.some(role => userRoles.includes(role));
        },
        meta: {
            displayName: "Role",
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
