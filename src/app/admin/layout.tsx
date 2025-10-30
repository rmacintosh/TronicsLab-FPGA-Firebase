
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useData } from '@/components/providers/data-provider';
import { FullScreenSpinner } from '@/components/ui/spinner';
import { AdminHeader } from '@/components/layout/admin-header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { userRoles, isLoading: rolesLoading } = useData();
  const router = useRouter();

  useEffect(() => {
    const isAuthorized = userRoles.includes('admin') || userRoles.includes('author') || userRoles.includes('moderator');

    if (!isUserLoading && !rolesLoading) {
      if (!user) {
        router.push('/login');
      } else if (!isAuthorized) {
        router.push('/');
      }
    }
  }, [user, isUserLoading, userRoles, rolesLoading, router]);

  const isAuthorized = userRoles.includes('admin') || userRoles.includes('author') || userRoles.includes('moderator');

  if (isUserLoading || rolesLoading || !user || !isAuthorized) {
    return <FullScreenSpinner />;
  }

  return (
    <>
      <AdminHeader />
      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </>
  );
}
