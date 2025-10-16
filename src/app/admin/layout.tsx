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

  useEffect(() => {
    const isLoading = isUserLoading || (user && isRoleLoading);
    if (isLoading) {
      return; 
    }

    if (!user || userData?.role !== 'admin') {
      router.replace('/');
    }
  }, [user, userData, isUserLoading, isRoleLoading, router]);

  const isLoading = isUserLoading || (user && isRoleLoading);

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

  return <>{children}</>;
}
