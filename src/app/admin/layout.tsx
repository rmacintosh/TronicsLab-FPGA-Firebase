
"use client";

import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, claims, isUserLoading } = useUser();
  const router = useRouter();

  const isAdmin = claims?.claims?.admin === true;

  useEffect(() => {
    // If loading is finished and the user is not an admin, redirect.
    if (!isUserLoading && !isAdmin) {
      router.replace('/');
    }
  }, [isUserLoading, isAdmin, router]);

  // While loading, or if the user is not an admin (and redirect is in progress), show a skeleton loader.
  if (isUserLoading || !isAdmin) {
    return (
      <div className="space-y-8">
        <h1 className="font-headline text-4xl font-bold tracking-tight">Admin Panel</h1>
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
