
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

  const userDocRef = useMemoFirebase(() => {
    // Only create the document reference if we have a user and firestore
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  // isRoleLoading will be true until userDocRef is valid and data is fetched
  const { data: userData, isLoading: isRoleLoading } = useDoc<{ role: string }>(userDocRef);

  const isAuthenticating = isUserLoading || (user && isRoleLoading);

  useEffect(() => {
    // This effect runs when loading is finished.
    // If, after everything has loaded, there is no user OR the user is not an admin, then redirect.
    if (!isAuthenticating && (!user || userData?.role !== 'admin')) {
      router.replace('/');
    }
  }, [isAuthenticating, user, userData, router]);

  // If we are still authenticating, show a loading screen.
  // This prevents the redirect from happening prematurely.
  if (isAuthenticating) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // If loading is complete AND the user is an admin, render the children.
  // The useEffect above handles the non-admin redirect case.
  if (userData?.role === 'admin') {
    return <>{children}</>;
  }
  
  // As a final fallback (e.g., if redirect hasn't fired yet), show loading.
  return (
    <div className="space-y-8">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
    </div>
  );
}
