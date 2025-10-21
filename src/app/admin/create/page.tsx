
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/components/providers/data-provider";
import { useUser } from "@/firebase";
import slugify from "slugify";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createArticleAction, NewArticleData } from "@/app/actions";
import { Category } from "@/lib/server-types";
import { useMemo } from "react";

const articleSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  content: z.string().min(50, "Content must be at least 50 characters"),
  categoryId: z.string().min(1, "Please select a category"),
});

interface HierarchicalCategory extends Category {
  children: HierarchicalCategory[];
  level: number;
}

export default function CreateArticlePage() {
    const { categories } = useData();
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const hierarchicalCategories = useMemo(() => {
        const categoryMap: Record<string, HierarchicalCategory> = {};
        const topLevelCategories: HierarchicalCategory[] = [];

        categories.forEach(cat => {
            categoryMap[cat.id] = { ...cat, children: [], level: 0 };
        });

        categories.forEach(cat => {
            if (cat.parentId && categoryMap[cat.parentId]) {
                categoryMap[cat.parentId].children.push(categoryMap[cat.id]);
            } else {
                topLevelCategories.push(categoryMap[cat.id]);
            }
        });

        function setLevels(categories: HierarchicalCategory[], level = 0) {
            categories.forEach(cat => {
                cat.level = level;
                setLevels(cat.children, level + 1);
            });
        }

        setLevels(topLevelCategories);
        return topLevelCategories;
    }, [categories]);

    const renderCategoryOptions = (categories: HierarchicalCategory[]) => {
        let options: JSX.Element[] = [];
        categories.forEach(cat => {
            options.push(
                <SelectItem key={cat.id} value={cat.id} style={{ paddingLeft: `${cat.level * 20}px` }}>
                    {cat.name}
                </SelectItem>
            );
            if (cat.children.length > 0) {
                options = options.concat(renderCategoryOptions(cat.children));
            }
        });
        return options;
    };

    const form = useForm<z.infer<typeof articleSchema>>({
        resolver: zodResolver(articleSchema),
        defaultValues: {
            title: "",
            content: "",
            categoryId: "",
        },
    });

    async function onSubmit(values: z.infer<typeof articleSchema>) {
        if (!user) {
            toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
            return;
        }

        try {
            const articleSlug = slugify(values.title, { lower: true, strict: true });

            const newArticleData: NewArticleData = {
                slug: articleSlug,
                title: values.title,
                description: values.content.substring(0, 150) + (values.content.length > 150 ? '...' : ''),
                categoryId: values.categoryId,
                content: values.content,
                image: {
                    id: 'new-article-' + articleSlug,
                    imageUrl: `https://picsum.photos/seed/${articleSlug}/600/400`,
                    imageHint: 'abstract technology',
                },
            };

            const authToken = await user.getIdToken();
            const result = await createArticleAction(authToken, newArticleData);

            if (result.success && result.slug) {
                toast({ title: "Article Created!", description: "Your new article has been published." });
                router.push(`/articles/${result.slug}`);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error Creating Article",
                description: error.message || "An unexpected error occurred.",
            });
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="font-headline text-4xl font-bold tracking-tight">Create New Article</h1>
            <Card>
                <CardContent className="pt-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter a catchy title for your article" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a category for your article" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {renderCategoryOptions(hierarchicalCategories)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Content</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Write your article content here. Markdown is supported."
                                                className="min-h-[300px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            You can use markdown for formatting your article.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Publishing...' : 'Publish Article'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}