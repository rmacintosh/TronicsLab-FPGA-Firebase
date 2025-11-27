"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TiptapEditor from "@/components/tiptap-editor";
import { useData } from "@/components/providers/data-provider";
import { useFirebase, useStorage } from "@/firebase/provider";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Category, Article } from "@/lib/types";
import { useMemo, useState, use, useEffect } from "react";
import { updateArticleAction } from "@/lib/actions/article.actions";
import Image from 'next/image';
import { X } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const articleSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  content: z.string().min(50, "Content must be at least 50 characters"),
  imageHint: z.string().optional(),
  categoryId: z.string({ required_error: "Please select a category" }).min(1, "Please select a category"),
});

interface HierarchicalCategory extends Category {
  children: HierarchicalCategory[];
  level: number;
}

function EditArticleForm({ article, categories, isAdmin }: { article: Article; categories: Category[], isAdmin: boolean }) {
    const { refreshData } = useData();
    const { user } = useFirebase();
    const storage = useStorage();
    const router = useRouter();
    const { toast } = useToast();
    
    const [imagePreview, setImagePreview] = useState<string | null>(article.image?.imageUrl || null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [isImageRemoved, setIsImageRemoved] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const form = useForm<z.infer<typeof articleSchema>>({
        resolver: zodResolver(articleSchema),
        mode: 'onChange',
        values: {
            title: article.title,
            description: article.description,
            content: article.content,
            imageHint: article.image?.imageHint || "",
            categoryId: article.categoryId, // Directly use the correct categoryId from the article
        },
    });

    const selectedCategoryId = form.watch('categoryId');
    const selectedCategory = useMemo(() => 
        categories.find(c => c.id === selectedCategoryId)
    , [categories, selectedCategoryId]);

    const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        toast({ title: "Uploading Image...", description: "Please wait while the image is uploaded." });

        try {
            const storageRef = ref(storage, `images/${user.uid}/${Date.now()}-${file.name}`);
            const uploadTask = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadTask.ref);

            setImagePreview(downloadURL);
            setUploadedImageUrl(downloadURL);
            setIsImageRemoved(false);
            toast({ title: "Image Uploaded!", description: "The image has been successfully uploaded." });
        } catch (error) {
            console.error("Image upload error:", error);
            toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload the image." });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveImage = async () => {
        if (uploadedImageUrl) {
            try {
                const imageRef = ref(storage, uploadedImageUrl);
                await deleteObject(imageRef);
                toast({ title: "Image Removed", description: "The uploaded image has been removed." });
            } catch (error) {
                console.error("Error deleting image:", error);
                toast({
                    variant: "destructive",
                    title: "Error Removing Image",
                    description: "Could not remove the uploaded image from storage.",
                });
            }
        }
        
        setImagePreview(null);
        setUploadedImageUrl(null);
        setIsImageRemoved(true);
        form.setValue('imageHint', ''); 
    };

    async function onSubmit(values: z.infer<typeof articleSchema>) {
        if (!user || !article) {
            toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to edit an article." });
            return;
        }

        try {
            const authToken = await user.getIdToken();

            const updatePayload: { [key: string]: any } = {
                description: values.description,
                content: values.content,
            };
            
            if (isAdmin) {
                updatePayload.title = values.title;
                updatePayload.categoryId = values.categoryId;
            }

            if (uploadedImageUrl) {
                // Case 1: A new image was uploaded in this session
                updatePayload.image = {
                    id: article.image?.id || 'img-' + Date.now(),
                    imageUrl: uploadedImageUrl,
                    imageHint: values.imageHint || '',
                };
            } else if (isImageRemoved) {
                // Case 2: The existing image was removed
                updatePayload.image = null;
            } else if (article.image && values.imageHint !== article.image.imageHint) {
                // Case 3: Only the image hint was changed
                updatePayload.image = {
                    ...article.image,
                    imageHint: values.imageHint || '',
                };
            }
            
            const result = await updateArticleAction(authToken, article.id, updatePayload as any);

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
    
    useEffect(() => {
        if (isImageRemoved) {
          form.setValue('imageHint', '');
        }
      }, [isImageRemoved, form]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Edit Article</CardTitle>
                <CardDescription>Edit the details of your article. Authors can only edit the description, content and image.</CardDescription>
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
                                        <Input placeholder="Enter a catchy title for your article" {...field} disabled={!isAdmin} />
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
                                        <Textarea placeholder="A brief summary of your article" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormItem>
                            <FormLabel>Article Image</FormLabel>
                            {imagePreview ? (
                                <div className="relative w-fit">
                                    <Image
                                        src={imagePreview}
                                        alt="Article preview"
                                        width={200}
                                        height={100}
                                        className="rounded-md object-cover"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-0 right-0"
                                        onClick={handleRemoveImage}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <FormControl>
                                    <Input 
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        disabled={isUploading}
                                    />
                                </FormControl>
                            )}
                            <FormMessage />
                        </FormItem>

                        <FormField
                            control={form.control}
                            name="imageHint"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Image Hint</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="A short description of the image for AI processing" 
                                            {...field}
                                            disabled={!imagePreview || isUploading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isAdmin && selectedCategory && (
                            <div className="space-y-2">
                                <FormLabel>Category</FormLabel>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 rounded-md px-3 py-1 text-sm font-semibold text-white" style={{backgroundColor: '#1E86AF'}}>
                                        {selectedCategory.name}
                                        <button
                                            type="button"
                                            onClick={() => form.setValue('categoryId', '', { shouldValidate: true })}
                                            className="text-white hover:text-gray-200"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={isAdmin && selectedCategory ? 'hidden' : 'block'}>
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        {isAdmin ? (
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a category for your article" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {renderCategoryOptions(hierarchicalCategories)}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <FormControl>
                                                <Input value={selectedCategory?.name || article.categoryName} disabled />
                                            </FormControl>
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
                                        <TiptapEditor content={field.value} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={form.formState.isSubmitting || isUploading}>
                            {isUploading ? 'Uploading Image...' : form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const { articles, categories, isAdmin, isLoading } = useData();

    const article = useMemo(
        () => articles.find((a) => a.slug === slug),
        [articles, slug]
    );

    if (isLoading) {
        return <div>Loading page...</div>;
    }

    if (!article) {
        return <div>Article not found.</div>;
    }

    return <EditArticleForm article={article} categories={categories} isAdmin={isAdmin} />;
}
