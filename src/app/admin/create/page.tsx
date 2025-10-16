"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { categories } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

type CategoryKey = keyof typeof categories;

const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  newCategory: z.string().optional(),
  subCategory: z.string().optional(),
  newSubCategory: z.string().optional(),
  image: z.any().optional(),
}).refine(data => data.category !== 'new' || (data.category === 'new' && data.newCategory && data.newCategory.length > 0), {
    message: "New category name cannot be empty.",
    path: ["newCategory"],
}).refine(data => {
    if (data.category === 'new') return true; // if category is new, subcategory logic is different
    const selectedCategory = categories[data.category as CategoryKey];
    if (!selectedCategory) return true; // no validation if category doesn't exist
    return data.subCategory !== 'new' || (data.subCategory === 'new' && data.newSubCategory && data.newSubCategory.length > 0);
}, {
    message: "New sub-category name cannot be empty.",
    path: ["newSubCategory"],
});


export default function CreateArticlePage() {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof articleSchema>>({
        resolver: zodResolver(articleSchema),
        defaultValues: {
            title: "",
            content: "",
            category: "",
            newCategory: "",
            subCategory: "",
            newSubCategory: "",
        },
    });

    const selectedCategory = form.watch("category");
    const selectedSubCategory = form.watch("subCategory");
    
    const isNewCategory = selectedCategory === 'new';
    const currentCategoryKey = selectedCategory as CategoryKey;

    const handleCategoryChange = (value: string) => {
        form.setValue("category", value);
        form.setValue("subCategory", ""); 
        form.setValue("newCategory", "");
        form.setValue("newSubCategory", "");
    };

    const handleSubCategoryChange = (value: string) => {
        form.setValue("subCategory", value);
        form.setValue("newSubCategory", "");
    }

    function onSubmit(values: z.infer<typeof articleSchema>) {
        // Here you would typically send the data to your backend
        console.log(values);
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
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                          {Object.entries(categories).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>{value.name}</SelectItem>
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
                                  name="subCategory"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Sub-category</FormLabel>
                                      <Select 
                                        onValueChange={handleSubCategoryChange} 
                                        value={field.value}
                                        disabled={!selectedCategory || isNewCategory}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a sub-category" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {selectedCategory && categories[currentCategoryKey] && categories[currentCategoryKey].subCategories.map(sub => (
                                                <SelectItem key={sub.slug} value={sub.slug}>{sub.name}</SelectItem>
                                            ))}
                                            <SelectItem value="new">Create new sub-category...</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      {(selectedSubCategory === 'new' || isNewCategory) && (
                                        <FormField
                                          control={form.control}
                                          name="newSubCategory"
                                          render={({ field }) => (
                                            <FormItem className="mt-2">
                                              <FormControl>
                                                <Input placeholder="Enter new sub-category name" {...field} />
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
                            </div>

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
                                            <Input type="file" {...field} />
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
