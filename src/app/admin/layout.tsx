
"use client";

import { useUser, useDoc, useFirebase, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { doc } from "firebase/firestore";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userData, isLoading: isRoleLoading } = useDoc<{ role: string }>(userDocRef);

  const isLoading = isUserLoading || (user && isRoleLoading);
  const isAdmin = userData?.role === 'admin';

  useEffect(() => {
    // If loading is finished and the user is not an admin, redirect.
    if (!isLoading && !isAdmin) {
      router.replace('/');
    }
  }, [isLoading, isAdmin, router]);

  // While loading, or if the user is not an admin (and redirect is in progress), show a skeleton loader.
  if (isLoading || !isAdmin) {
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
