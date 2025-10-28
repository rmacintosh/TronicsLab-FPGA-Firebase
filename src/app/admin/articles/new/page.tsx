
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TiptapEditor from "@/components/tiptap-editor";
import { useData } from "@/components/providers/data-provider";
import { useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Category } from "@/lib/server-types";
import { useMemo, useState } from "react";
import { uploadImageAction } from "@/app/actions";

const articleSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  content: z.string().min(50, "Content must be at least 50 characters"),
  imageHint: z.string().min(10, "Image hint must be at least 10 characters"),
  categoryId: z.string().min(1, "Please select a category"),
});

interface HierarchicalCategory extends Category {
  children: HierarchicalCategory[];
  level: number;
}

export default function NewArticlePage() {
  const { categories, refreshData, createArticle } = useData();
  const { user } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof articleSchema>>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      imageHint: "",
      categoryId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof articleSchema>) {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to create an article." });
      return;
    }

    try {
        const authToken = await user.getIdToken();
        let imageUrl = "";

        if (imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);
            const uploadResult = await uploadImageAction(authToken, formData);
            if (!uploadResult.success || !uploadResult.url) {
                throw new Error(uploadResult.message || "Image upload failed.");
            }
            imageUrl = uploadResult.url;
        } else {
            throw new Error("An article image is required.");
        }

      const slug = values.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');

      const result = await createArticle({
        slug,
        title: values.title,
        description: values.description,
        content: values.content,
        categoryId: values.categoryId,
        image: {
            id: 'img-' + Date.now(),
            imageUrl: imageUrl!,
            imageHint: values.imageHint,
        },
    });

      if (result.success && result.slug) {
        toast({ title: "Article Created!", description: "The article has been successfully created." });
        refreshData();
        router.push(`/admin/articles/edit/${result.slug}`);
      } else {
        toast({
            variant: "destructive",
            title: "Error Creating Article",
            description: result.message || "An unexpected error occurred.",
        });
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Creating Article",
        description: error.message || "An unexpected error occurred.",
      });
    }
  }
  
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Article</CardTitle>
        <CardDescription>Create a new article for your website.</CardDescription>
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
                name="description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Input placeholder="A brief summary of your article" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormItem>
                <FormLabel>Article Image</FormLabel>
                <FormControl>
                    <Input 
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                    />
                </FormControl>
                <FormMessage />
            </FormItem>

            <FormField
                control={form.control}
                name="imageHint"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Image Hint</FormLabel>
                        <FormControl>
                            <Input placeholder="A short description of the image for AI processing" {...field} />
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                            <TiptapEditor content={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creating...' : 'Create Article'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
