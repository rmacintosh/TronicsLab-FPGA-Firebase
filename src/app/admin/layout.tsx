
"use client";

import { useData } from "@/components/providers/data-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAdmin, isLoading } = useData();

  useEffect(() => {
    // If the role check is complete and the user is not an admin, redirect them.
    if (!isLoading && !isAdmin) {
      router.replace('/');
    }
  }, [isLoading, isAdmin, router]);

  // While we are checking for the role, or if the user is not an admin
  // (and the redirect is in progress), show a loading skeleton.
  if (isLoading || !isAdmin) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
            <h1 className="font-headline text-4xl font-bold tracking-tight">Admin Panel</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // If loading is complete and the user is an admin, render the children.
  return <>{children}</>;
}
