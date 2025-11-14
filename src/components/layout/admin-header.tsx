
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { name: "Dashboard", href: "/admin" },
  { name: "Articles", href: "/admin/articles" },
  { name: "Categories", href: "/admin/categories" },
  { name: "Comments", href: "/admin/comments" },
  { name: "Users", href: "/admin/users" },
];

export function AdminHeader() {
  const pathname = usePathname();

  return (
    <div className="border-b mb-8">
      <div className="flex items-center gap-4 px-4 sm:px-6">
        {adminNavItems.map((item) => (
          <Link key={item.name} href={item.href} passHref>
            <Button
              variant="ghost"
              className={cn(
                "rounded-none border-b-2 border-transparent hover:bg-muted hover:border-primary",
                pathname.startsWith(item.href) && item.href !== "/admin" || pathname === item.href
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
