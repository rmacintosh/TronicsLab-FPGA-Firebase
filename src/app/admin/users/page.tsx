
"use client";

import { useData } from "@/components/providers/data-provider";
import { columns } from "./components/columns";
import { DataTable } from "./components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersPage() {
    const { users } = useData();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Users</CardTitle>
            </CardHeader>
            <CardContent>
                <DataTable columns={columns} data={users} />
            </CardContent>
        </Card>
    );
}
