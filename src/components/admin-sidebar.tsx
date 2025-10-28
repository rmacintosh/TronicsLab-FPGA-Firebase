
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/components/providers/data-provider";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
    const pathname = usePathname();
    const { userRoles } = useData();

    const canManageUsers = userRoles.includes('admin');
    const canManageArticles = userRoles.includes('admin') || userRoles.includes('author');
    const canManageComments = userRoles.includes('admin') || userRoles.includes('moderator');

    const routes = [
        { href: '/admin', label: 'Dashboard', active: pathname === '/admin', show: true },
        { href: '/admin/articles', label: 'Articles', active: pathname.startsWith('/admin/articles'), show: canManageArticles },
        { href: '/admin/categories', label: 'Categories', active: pathname.startsWith('/admin/categories'), show: canManageUsers },
        { href: '/admin/comments', label: 'Comments', active: pathname.startsWith('/admin/comments'), show: canManageComments },
        { href: '/admin/users', label: 'Users', active: pathname.startsWith('/admin/users'), show: canManageUsers },
    ];

    return (
        <nav className="grid items-start gap-2">
            {routes.map((route) => (
                route.show && (
                    <Link key={route.href} href={route.href}>
                        <span
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                route.active ? "bg-accent" : "transparent"
                            )}
                        >
                            <span>{route.label}</span>
                        </span>
                    </Link>
                )
            ))}
        </nav>
    );
}
