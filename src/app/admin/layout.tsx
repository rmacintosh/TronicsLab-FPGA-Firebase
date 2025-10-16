
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
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isRoleLoading } = useDoc<{ role: string }>(userDocRef);

  const isLoading = isUserLoading || isRoleLoading;

  useEffect(() => {
    // If not loading and not an admin, redirect.
    if (!isLoading && (!user || userData?.role !== 'admin')) {
      router.replace('/');
    }
  }, [user, userData, isLoading, router]);

  // While loading, or if the user is not yet confirmed as an admin, show a loading state.
  // This prevents the flicker and premature redirect.
  if (isLoading || !user || userData?.role !== 'admin') {
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

  // Only if all checks pass, render the actual admin content.
  return <>{children}</>;
}
