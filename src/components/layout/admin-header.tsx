
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useData } from "../providers/data-provider";

const allAdminNavItems = [
  { name: "Dashboard", href: "/admin", roles: ["admin"] },
  { name: "Articles", href: "/admin/articles", roles: ["admin", "author"] },
  { name: "Categories", href: "/admin/categories", roles: ["admin", "author"] },
  { name: "Comments", href: "/admin/comments", roles: ["admin", "moderator"] },
  { name: "Users", href: "/admin/users", roles: ["admin"] },
] as const;

export function AdminHeader() {
  const pathname = usePathname();
  const { userRoles } = useData();

  const adminNavItems = allAdminNavItems.filter((item) =>
    item.roles.some((role) => userRoles.includes(role))
  );

  return (
    <div className="border-b mb-8">
      <div className="flex items-center gap-4 px-4 sm:px-6">
        {adminNavItems.map((item) => (
          <Link key={item.name} href={item.href} passHref>
            <Button
              variant="ghost"
              className={cn(
                "rounded-none border-b-2 border-transparent hover:bg-muted hover:border-primary",
                (pathname.startsWith(item.href) && item.href !== "/admin") || pathname === item.href
                  ? "border-primary"
                  : ""
              )}
            >
              {item.name}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
