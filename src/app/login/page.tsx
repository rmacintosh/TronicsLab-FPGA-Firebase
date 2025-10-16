"use client";

import Link from "next/link"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Cpu } from "lucide-react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast";
import { initiateEmailSignIn } from "@/firebase/non-blocking-login";
import { useAuth } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/firebase/provider";
import { signInWithEmailAndPassword } from "firebase/auth";


const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push('/');
    } catch (error: any) {
      let description = "An unexpected error occurred.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        description = "Invalid email or password. Please try again.";
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: description,
      });
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
              <Link href="/" className="flex items-center gap-2 text-foreground">
                  <Cpu className="h-8 w-8 text-primary" />
                  <span className="font-headline text-2xl font-semibold">TronicsLab</span>
              </Link>
          </div>
          <CardTitle className="text-2xl font-headline">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
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
                                    <Input placeholder="m@example.com" {...field} />
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
                                    <Link
                                      href="#"
                                      className="ml-auto inline-block text-sm underline"
                                    >
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
                    <Button variant="outline" className="w-full" disabled>
                      Login with GitHub
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
