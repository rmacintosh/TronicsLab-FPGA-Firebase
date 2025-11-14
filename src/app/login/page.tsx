'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useUser } from "@/firebase/provider"
import { initiateEmailSignIn, initiateGoogleSignIn } from "@/firebase/non-blocking-login"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  getAuth,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  signInWithEmailAndPassword,
  OAuthCredential
} from "firebase/auth"

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
})

export default function LoginPage() {
  const { user, isUserLoading: isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, values.email, values.password);
    } catch (error) {
      console.error("Login failed:", error);
      alert(`Login failed. Please try again. Error: ${(error as Error).message}`);
    }
  }

  async function handleGoogleLogin() {
    const auth = getAuth();
    try {
      await initiateGoogleSignIn(auth);
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        const pendingCred = error.credential as OAuthCredential;
        const email = error.customData.email as string;
        const methods = await fetchSignInMethodsForEmail(auth, email);

        if (methods[0] === 'password') {
          const password = prompt(
            `You already have an account with ${email}. Please enter your password to link your Google account.`
          );

          if (password) {
            try {
              const userCredential = await signInWithEmailAndPassword(auth, email, password);
              await linkWithCredential(userCredential.user, pendingCred);
              alert("Successfully linked your Google account!");
            } catch (linkError: any) {
              console.error("Error linking account:", linkError);
              alert(`Could not link accounts. Error: ${linkError.message}`);
            }
          }
        } else {
          alert(`An account already exists for ${email} using the provider: ${methods[0]}. Please sign in with that provider.`);
        }
      } else if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Google login failed:", error);
        alert(`Google login failed. Error: ${error.message}`);
      }
    }
  }

  if (isLoading || user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                      <FormLabel>Password</FormLabel>
                      <Link href="#" className="ml-auto inline-block text-sm underline">
                        Forgot your password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Login
              </Button>
              <Button variant="outline" type="button" className="w-full" onClick={handleGoogleLogin}>
                Login with Google
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
