
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

  // We are authenticating if we are still waiting for the user OR if we have a user but are still waiting for their role.
  const isAuthenticating = isUserLoading || (!!user && isRoleLoading);

  useEffect(() => {
    // This effect runs whenever the loading state or user data changes.
    // If we are done authenticating and there is NO user, or the user is NOT an admin, then we redirect.
    if (!isAuthenticating && (!user || userData?.role !== 'admin')) {
      router.replace('/');
    }
  }, [isAuthenticating, user, userData, router]);

  // If we are still in the process of authenticating, show a loading skeleton.
  // This is the key part that prevents premature redirects.
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

  // If loading is complete AND we have confirmed the user's role is 'admin', render the children.
  // The useEffect handles the non-admin redirect case, so we just need to check for the successful case here.
  if (userData?.role === 'admin') {
    return <>{children}</>;
  }
  
  // As a final fallback (e.g., if the redirect from useEffect hasn't fired yet), show the loading skeleton.
  // This prevents a brief flash of un-guarded content before redirection.
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
