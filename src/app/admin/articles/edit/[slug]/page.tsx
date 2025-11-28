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
import { useFirebase } from "@/firebase/provider";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Category, Article } from "@/lib/types";
import { useMemo, useState, use, useEffect } from "react";
import { updateArticleAction } from "@/lib/actions/article.actions";
import Image from 'next/image';
import { X } from 'lucide-react';
import { uploadImage, deleteImage } from '@/lib/image-upload';
import { getFirestore, doc, collection } from 'firebase/firestore';

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
    const { refreshData, updateArticle } = useData();
    const { user } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    
    const [imagePreview, setImagePreview] = useState<string | null>(article.image?.imageUrl || null);
    const [uploadedImage, setUploadedImage] = useState<{ imageId: string, previewUrl: string, file: File } | null>(null);
    const [isImageRemoved, setIsImageRemoved] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const originalImageId = article.image?.id; // Keep track of the original image

    const form = useForm<z.infer<typeof articleSchema>>({
        resolver: zodResolver(articleSchema),
        mode: 'onChange',
        values: {
            title: article.title,
            description: article.description,
            content: article.content,
            imageHint: article.image?.imageHint || "",
            categoryId: article.categoryId,
        },
    });

    useEffect(() => {
      // Cleanup for object URLs
      return () => {
        if (uploadedImage?.previewUrl) {
          URL.revokeObjectURL(uploadedImage.previewUrl);
        }
      };
    }, [uploadedImage]);

    const selectedCategoryId = form.watch('categoryId');
    const selectedCategory = useMemo(() => 
        categories.find(c => c.id === selectedCategoryId)
    , [categories, selectedCategoryId]);

    const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        const { id, update } = toast({ title: "Uploading Image..." });

        try {
            // If there's an old image (either original or a newly uploaded one), delete it first
            if (imagePreview) {
                const imageIdToDelete = uploadedImage?.imageId || originalImageId;
                if (imageIdToDelete) {
                    await deleteImage(imageIdToDelete);
                }
            }

            const db = getFirestore();
            const imageRef = doc(collection(db, 'images'));
            const imageId = imageRef.id;

            await uploadImage(file, user.uid, imageId);

            const previewUrl = URL.createObjectURL(file);
            setUploadedImage({ imageId, previewUrl, file });
            setImagePreview(previewUrl);
            setIsImageRemoved(false);

            update({ id, title: "Image Uploaded!", description: "The image is ready." });
        } catch (error) {
            console.error("Image upload error:", error);
            update({ id, variant: "destructive", title: "Upload Failed", description: "Could not upload the image." });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveImage = async () => {
        const imageIdToDelete = uploadedImage?.imageId || originalImageId;

        if (imageIdToDelete) {
            try {
                await deleteImage(imageIdToDelete);
                toast({ title: "Image Removed" });
            } catch (error) {
                console.error("Error deleting image:", error);
                toast({
                    variant: "destructive",
                    title: "Error Removing Image",
                    description: "Could not remove the image from storage.",
                });
                return; // Stop if deletion fails
            }
        }

        if (uploadedImage?.previewUrl) {
            URL.revokeObjectURL(uploadedImage.previewUrl);
        }
        
        setImagePreview(null);
        setUploadedImage(null);
        setIsImageRemoved(true);
        form.setValue('imageHint', ''); 
    };

    async function onSubmit(values: z.infer<typeof articleSchema>) {
        if (!user || !article) {
            toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to edit an article." });
            return;
        }

        const updatePayload: { [key: string]: any } = {
            description: values.description,
            content: values.content,
        };
        
        if (isAdmin) {
            updatePayload.title = values.title;
            updatePayload.categoryId = values.categoryId;
        }

        // Case 1: A new image was uploaded in this session.
        if (uploadedImage) {
            updatePayload.image = {
                id: uploadedImage.imageId,
                imageHint: values.imageHint || '',
                imageUrl: '', // This triggers the listener on the article page
            };
        } 
        // Case 2: The existing image was removed.
        else if (isImageRemoved) {
            updatePayload.image = null;
        } 
        // Case 3: Only the image hint was changed for the existing image.
        else if (originalImageId && values.imageHint !== article.image.imageHint) {
            updatePayload.image = {
                ...article.image,
                imageHint: values.imageHint || '',
            };
        }
        
        try {
            const result = await updateArticle(article.id, updatePayload);

            if (result.success) {
                toast({ title: "Article Updated!", description: "The article has been successfully updated." });
                refreshData();
                router.push(`/admin/articles`);
            } else {
                throw new Error(result.message);
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
                                        type="button"
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
