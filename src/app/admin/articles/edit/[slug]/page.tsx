
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/components/providers/data-provider";
import { useUser } from "@/firebase";
import slugify from "slugify";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Category, Article } from "@/lib/server-types";
import { useMemo, useEffect } from "react";

const articleSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  content: z.string().min(50, "Content must be at least 50 characters"),
  categoryId: z.string().min(1, "Please select a category"),
});

interface HierarchicalCategory extends Category {
  children: HierarchicalCategory[];
  level: number;
}

export default function EditArticlePage({ params }: { params: { slug: string } }) {
  const { articles, categories, refreshData, updateArticle } = useData();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const article = useMemo(
    () => articles.find((a) => a.slug === params.slug),
    [articles, params.slug]
  );

  const hierarchicalCategories = useMemo(() => {
    const categoryMap: Record<string, HierarchicalCategory> = {};
    const topLevelCategories: HierarchicalCategory[] = [];

    categories.forEach((cat) => {
      categoryMap[cat.id] = { ...cat, children: [], level: 0 };
    });

    categories.forEach((cat) => {
      if (cat.parentId && categoryMap[cat.parentId]) {
        categoryMap[cat.parentId].children.push(categoryMap[cat.id]);
      } else {
        topLevelCategories.push(categoryMap[cat.id]);
      }
    });

    function setLevels(categories: HierarchicalCategory[], level = 0) {
      categories.forEach((cat) => {
        cat.level = level;
        setLevels(cat.children, level + 1);
      });
    }

    setLevels(topLevelCategories);
    return topLevelCategories;
  }, [categories]);

  const renderCategoryOptions = (categories: HierarchicalCategory[]) => {
    let options: JSX.Element[] = [];
    categories.forEach((cat) => {
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

  useEffect(() => {
    if (article) {
      form.reset({
        title: article.title,
        content: article.content,
        categoryId: article.categoryId,
      });
    }
  }, [article, form]);

  async function onSubmit(values: z.infer<typeof articleSchema>) {
    if (!user || !article) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to edit an article." });
      return;
    }

    try {
      const updatedArticleData: Partial<Article> = {
        title: values.title,
        content: values.content,
        categoryId: values.categoryId,
        slug: slugify(values.title, { lower: true, strict: true }),
        description: values.content.substring(0, 150) + (values.content.length > 150 ? '...' : ''),
      };

      const result = await updateArticle(article.id, updatedArticleData);

      if (result.success) {
        toast({ title: "Article Updated!", description: "The article has been successfully updated." });
        refreshData();
        router.push(`/admin/articles`);
      } else {
        toast({
            variant: "destructive",
            title: "Error Updating Article",
            description: result.message || "An unexpected error occurred.",
        });
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Updating Article",
        description: error.message || "An unexpected error occurred.",
      });
    }
  }

  if (!article) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Article</CardTitle>
        <CardDescription>Edit the details of your article.</CardDescription>
      </CardHeader>
      <CardContent>
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
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
