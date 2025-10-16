
"use client";

import { useDoc, useFirebase, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();

  // CORRECTED: The dependency array now correctly includes `user` and `firestore`.
  // This ensures that the userDocRef is only calculated AFTER the user and firestore are available,
  // preventing a race condition where the reference is created for a null user.
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isRoleLoading } = useDoc<{ role: string }>(userDocRef);

  // We are authenticating if we are still waiting for the user OR if we have a user but are still waiting for their role.
  const isAuthenticating = isUserLoading || (!!user && isRoleLoading);

  useEffect(() => {
    // If we are done authenticating and there is no user OR the user is NOT an admin, redirect.
    if (!isAuthenticating && (!user || userData?.role !== 'admin')) {
      router.replace('/');
    }
  }, [isAuthenticating, user, userData, router]);

  // While authenticating, show a loading skeleton.
  if (isAuthenticating) {
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

  // If authentication is complete and the user is an admin, render the children.
  if (userData?.role === 'admin') {
    return <>{children}</>;
  }
  
  // Fallback to show loading skeleton while redirect is in progress.
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
