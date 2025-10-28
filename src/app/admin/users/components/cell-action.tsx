
"use client";

import { useState } from "react";
import { User, UserRole } from "@/lib/server-types";
import { useData } from "@/components/providers/data-provider";
import { useFirebase } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CellActionProps {
    data: User;
}

const ALL_ROLES: UserRole[] = ['admin', 'author', 'moderator'];

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const { user } = useFirebase();
    const { updateUserRoles, deleteUser } = useData();
    const { toast } = useToast();
    const [isManageRolesOpen, setManageRolesOpen] = useState(false);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(data.roles || []);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isCurrentUser = user?.uid === data.uid;

    const handleRoleChange = (role: UserRole, checked: boolean) => {
        setSelectedRoles(prev => 
            checked ? [...prev, role] : prev.filter(r => r !== role)
        );
    };

    const onManageRolesSubmit = async () => {
        setIsSaving(true);
        const result = await updateUserRoles(data.uid, selectedRoles);
        if (result.success) {
            toast({
                title: "User roles updated",
                description: `Successfully updated roles for ${data.name}.`,
            });
            setManageRolesOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Update failed",
                description: result.message,
            });
        }
        setIsSaving(false);
    };

    const onDeleteConfirm = async () => {
        setIsDeleting(true);
        const result = await deleteUser(data.uid);
        if (result.success) {
            toast({
                title: "User deleted",
                description: `Successfully deleted user ${data.name}.`
            });
            setDeleteDialogOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Deletion failed",
                description: result.message,
            });
        }
        setIsDeleting(false);
    };

    return (
        <>
            <Dialog open={isManageRolesOpen} onOpenChange={setManageRolesOpen}>
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem 
                                onSelect={() => setManageRolesOpen(true)} 
                                disabled={isCurrentUser}
                            >
                                Manage roles
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className="text-red-600" 
                                onSelect={() => setDeleteDialogOpen(true)} 
                                disabled={isCurrentUser}
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user and their data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={onDeleteConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                                {isDeleting ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>

                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Manage Roles for {data.name}</DialogTitle>
                            <DialogDescription>
                                Assign or remove roles for this user. Click save when you're done.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {ALL_ROLES.map(role => (
                                <div key={role} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={role}
                                        checked={selectedRoles.includes(role)}
                                        onCheckedChange={(checked) => handleRoleChange(role, !!checked)}
                                    />
                                    <Label htmlFor={role} className="capitalize">{role}</Label>
                                </div>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setManageRolesOpen(false)} disabled={isSaving}>Cancel</Button>
                            <Button onClick={onManageRolesSubmit} disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </AlertDialog>
            </Dialog>
        </>
    );
};
