
'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/provider'; // CORRECTED IMPORT
import { getAllUsersAction } from '@/lib/actions/user.actions';
import { User } from '@/lib/server-types';
import { columns } from './components/columns';
import { DataTable } from '@/app/admin/components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { roles } from "@/lib/constants";

export default function UsersPage() {
    const { user, isUserLoading } = useFirebase(); // CORRECT: Use useFirebase hook
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Don't fetch until the user's auth state is resolved
        if (isUserLoading) {
            setLoading(true);
            return;
        }

        const fetchUsers = async () => {
            // If user is not logged in, show an error.
            if (!user) {
                toast({
                    variant: "destructive",
                    title: "Authentication Error",
                    description: "You must be logged in to manage users.",
                });
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const authToken = await user.getIdToken(); // CORRECT: Get token from user object
                if (!authToken) {
                    throw new Error('Authentication token not available.');
                }
                const result = await getAllUsersAction(authToken);
                if (result.success && result.users) {
                    setUsers(result.users);
                } else {
                    toast({
                        variant: "destructive",
                        title: "Failed to fetch users",
                        description: result.message || 'An unknown error occurred.',
                    });
                }
            } catch (error: any) {
                console.error('Error fetching users:', error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message || 'An error occurred while fetching the user list.',
                });
            }
            setLoading(false);
        };

        fetchUsers();
    }, [user, isUserLoading, toast]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Manage Users</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Users</CardTitle>
            </CardHeader>
            <CardContent>
                <DataTable 
                    columns={columns} 
                    data={users} 
                    filterableColumns={[
                        {
                            id: 'roles',
                            title: 'Roles',
                            options: roles.map((role) => ({ label: role, value: role }))
                        }
                    ]}
                    searchableColumns={[
                        {
                            id: 'displayName',
                            placeholder: 'Filter by name...'
                        }
                    ]}
                    dateRangeColumns={[
                        {
                            id: "createdAt",
                        }
                    ]}
                />
            </CardContent>
        </Card>
    );
}
