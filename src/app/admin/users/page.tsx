
"use client";

import { useData } from "@/components/providers/data-provider";
import { columns } from "./components/columns";
import { DataTable } from "./components/data-table";

export default function UsersPage() {
    const { users } = useData();

    return (
        <div className="space-y-8">
            <h1 className="font-headline text-4xl font-bold tracking-tight">Manage Users</h1>
            <DataTable columns={columns} data={users} />
        </div>
    );
}
