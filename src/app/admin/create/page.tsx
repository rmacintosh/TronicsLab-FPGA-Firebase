
"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/components/providers/data-provider";
import { useUser } from "@/firebase";

const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  newCategory: z.string().optional(),
  image: z.any().optional(),
}).refine(data => data.category !== 'new' || (data.category === 'new' && data.newCategory && data.newCategory.length > 0), {
    message: "New category name cannot be empty.",
    path: ["newCategory"],
});


export default function CreateArticlePage() {
    const { toast } = useToast();
    const { categories, addArticle, addCategory, articles } = useData();
    const { user } = useUser();

    const form = useForm<z.infer<typeof articleSchema>>({
        resolver: zodResolver(articleSchema),
        defaultValues: {
            title: "",
            content: "",
            category: "",
            newCategory: "",
        },
    });

    const selectedCategory = form.watch("category");
    
    const isNewCategory = selectedCategory === 'new';
    
    const handleCategoryChange = (value: string) => {
        form.setValue("category", value);
        form.setValue("newCategory", "");
    };

    function slugify(text: string) {
        return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    }

    async function onSubmit(values: z.infer<typeof articleSchema>) {
        let finalCategorySlug: string;
        
        if (values.category === 'new' && values.newCategory) {
            finalCategorySlug = slugify(values.newCategory);
            await addCategory({ name: values.newCategory, slug: finalCategorySlug });
        } else {
            finalCategorySlug = values.category;
        }
    
        const newArticle = {
            slug: slugify(values.title),
            title: values.title,
            description: values.content.substring(0, 100) + '...',
            category: finalCategorySlug,
            author: user?.email || 'Admin',
            date: new Date().toISOString(),
            views: 0,
            image: {
                id: 'new-article',
                imageUrl: `https://picsum.photos/seed/${articles.length + 1}/600/400`,
                imageHint: 'abstract tech',
            },
            content: `<p>${values.content}</p>`,
        };
    
        await addArticle(newArticle);
    
        toast({
            title: "Article Published!",
            description: `The article "${values.title}" has been successfully published.`,
        });
        form.reset();
    }


    return (
        <div className="space-y-8">
            <h1 className="font-headline text-4xl font-bold tracking-tight">Create New Article</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Article Details</CardTitle>
                    <CardDescription>Fill out the form below to publish a new article.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter article title" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select onValueChange={handleCategoryChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                                      ))}
                                      <SelectItem value="new">Create new category...</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {isNewCategory && (
                                    <FormField
                                      control={form.control}
                                      name="newCategory"
                                      render={({ field }) => (
                                        <FormItem className="mt-2">
                                          <FormControl>
                                            <Input placeholder="Enter new category name" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  )}
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
                                            <Textarea placeholder="Write your article content here. You can use HTML for formatting." rows={15} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="image"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Featured Image</FormLabel>
                                        <FormControl>
                                            <Input type="file" onChange={(e) => field.onChange(e.target.files)} />
                                        </FormControl>
                                        <FormDescription>Upload a cover image for the article.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline">Save as Draft</Button>
                                <Button type="submit">Publish Article</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
