'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TiptapEditor from '@/components/tiptap-editor';
import { useData } from '@/components/providers/data-provider';
import { useFirebase } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/lib/server-types';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { uploadImage, deleteImage } from '@/lib/image-upload';
import { getFirestore, doc, collection } from 'firebase/firestore';

const articleSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  imageHint: z.string().optional(),
  categoryId: z.string({ required_error: 'Please select a category' }).min(1, 'Please select a category'),
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
  
  const [uploadedImage, setUploadedImage] = useState<{ imageId: string; previewUrl: string; file: File } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof articleSchema>>({
    resolver: zodResolver(articleSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      content: '',
      imageHint: '',
      categoryId: '',
    },
  });

  useEffect(() => {
    // Cleanup function to revoke the object URL to avoid memory leaks
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

    // If there's an old image, delete it first
    if (uploadedImage) {
        await handleRemoveImage();
    }

    setIsUploading(true);
    const { id, update } = toast({ title: 'Uploading Image...' });

    try {
      const db = getFirestore();
      const imageRef = doc(collection(db, 'images')); // Generate new ID locally
      const imageId = imageRef.id;

      // The uploadImage function now uploads to a temp path
      await uploadImage(file, user.uid, imageId);

      const previewUrl = URL.createObjectURL(file);
      setUploadedImage({ imageId, previewUrl, file });

      update({ id, title: 'Image Uploaded!', description: 'The image is ready for the article.' });
    } catch (error) {
      console.error('Image upload error:', error);
      update({
        id,
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Could not upload the image.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (uploadedImage) {
        try {
            // Call the cloud function to delete the image set from storage and firestore
            await deleteImage(uploadedImage.imageId);
            toast({ title: 'Image Removed', description: 'The uploaded image has been removed.' });
            
            URL.revokeObjectURL(uploadedImage.previewUrl);
            setUploadedImage(null);
            form.setValue('imageHint', '');
        } catch (error) {
            console.error('Error deleting image:', error);
            toast({
                variant: 'destructive',
                title: 'Error Removing Image',
                description: 'Could not remove the uploaded image.',
            });
        }
    }
  };

  async function onSubmit(values: z.infer<typeof articleSchema>) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to create an article.' });
      return;
    }

    if (!uploadedImage) {
        toast({ variant: 'destructive', title: 'Image Required', description: 'Please upload a feature image for the article.' });
        return;
    }

    try {
      const slug = values.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');

      // The `createArticle` action now handles associating the image ID
      const result = await createArticle({
        slug,
        title: values.title,
        description: values.description,
        content: values.content,
        categoryId: values.categoryId,
        image: {
            id: uploadedImage.imageId, 
            imageHint: values.imageHint || '',
            // These are not needed on the client, will be populated on the server
            imageUrl: '', 
            fileName: uploadedImage.file.name,
        },
    });

      if (result.success && result.slug) {
        toast({ title: 'Article Created!', description: 'The article has been successfully created.' });
        refreshData();
        // The new article is created, the image processing is now handled by cloud functions
        // and the article page itself will listen for the final image URLs.
        router.push(`/admin/articles`);
      } else {
        toast({
            variant: 'destructive',
            title: 'Error Creating Article',
            description: result.message || 'An unexpected error occurred.',
        });
        // If article creation fails, we should delete the orphaned uploaded image
        await handleRemoveImage();
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Creating Article',
        description: error.message || 'An unexpected error occurred.',
      });
       // If an error is caught, we should delete the orphaned uploaded image
      await handleRemoveImage();
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
                            <Textarea placeholder="A brief summary of your article" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormItem>
                <FormLabel>Article Image</FormLabel>
                {uploadedImage ? (
                    <div className="relative w-fit">
                        <Image
                            src={uploadedImage.previewUrl}
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
                                disabled={!uploadedImage || isUploading}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {selectedCategory && (
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

            <div className={selectedCategory ? 'hidden' : 'block'}>
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
              {isUploading ? 'Uploading Image...' : form.formState.isSubmitting ? 'Creating...' : 'Create Article'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
