
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { makeAdminAction } from '@/ai/actions';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function MakeAdminPage() {
  const { user, isUserLoading } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  const handleMakeAdmin = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await makeAdminAction();
      if (result.success) {
        // Force a refresh of the user's ID token to get the new custom claim.
        await user.getIdToken(true);
        
        toast({
          title: 'Success!',
          description: 'You have been granted admin privileges. You will be redirected shortly.',
        });

        // Redirect after a short delay to allow the user to read the toast.
        setTimeout(() => {
            router.push('/admin');
        }, 2000);
      } else {
        throw new Error(result.message || 'An unknown error occurred.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: error.message || 'Could not grant admin privileges.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || !user) {
      return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Grant Admin Privileges</CardTitle>
          <CardDescription>
            This is a one-time setup action to make the current user ({user.email}) an administrator. This page should be deleted after use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <p className="text-sm text-muted-foreground">
              Clicking the button below will call a secure server-side function to assign the 'admin' role to your account. This can only be done if there are no admins currently in the system.
            </p>
            <Button onClick={handleMakeAdmin} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Make Me Admin'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
