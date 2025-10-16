
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
import { Cpu } from "lucide-react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirebase, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

const signupSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function SignupPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const { firestore } = useFirebase();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
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

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const newUser = userCredential.user;

        if (newUser && firestore) {
            const userRef = doc(firestore, "users", newUser.uid);
            const isAdmin = values.email === 'rmacintosh@gmail.com';

            // Use an awaited setDoc to ensure this critical write completes.
            // This guarantees the role is set before the user might navigate to the admin panel.
            await setDoc(userRef, {
                uid: newUser.uid,
                email: values.email,
                role: isAdmin ? 'admin' : 'user',
                createdAt: new Date().toISOString(),
            });
        }
      
        toast({
            title: "Account Created",
            description: "You have successfully signed up!",
        });
        router.push('/');
    } catch (error: any) {
      let description = "An unexpected error occurred.";
      if (error.code === 'auth/email-already-in-use') {
        description = "This email address is already in use.";
      }
      toast({
        variant: "destructive",
        title: "Sign-up Failed",
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
          <CardTitle className="text-2xl font-headline">Sign Up</CardTitle>
          <CardDescription>
            Enter your information to create an account
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
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">
                      Create an account
                    </Button>
                </form>
            </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
