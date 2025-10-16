"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { categories } from "@/lib/data";

type CategoryKey = keyof typeof categories;

export default function CreateArticlePage() {
    const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<string>("");

    const handleCategoryChange = (value: string) => {
        const categoryKey = value as CategoryKey;
        setSelectedCategory(categoryKey);
        setSelectedSubCategory(""); // Reset subcategory when category changes
    };

    return (
        <div className="space-y-8">
            <h1 className="font-headline text-4xl font-bold tracking-tight">Create New Article</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Article Details</CardTitle>
                    <CardDescription>Fill out the form below to publish a new article.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" placeholder="Enter article title" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select onValueChange={handleCategoryChange}>
                                <SelectTrigger id="category">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(categories).map(([key, value]) => (
                                        <SelectItem key={key} value={key}>{value.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subcategory">Sub-category</Label>
                            <Select 
                                value={selectedSubCategory} 
                                onValueChange={setSelectedSubCategory}
                                disabled={!selectedCategory}
                            >
                                <SelectTrigger id="subcategory">
                                    <SelectValue placeholder="Select a sub-category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedCategory && categories[selectedCategory].subCategories.map(sub => (
                                        <SelectItem key={sub.slug} value={sub.slug}>{sub.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea id="content" placeholder="Write your article content here. You can use HTML for formatting." rows={15} />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="picture">Featured Image</Label>
                        <Input id="picture" type="file" />
                         <p className="text-xs text-muted-foreground">Upload a cover image for the article.</p>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline">Save as Draft</Button>
                        <Button>Publish Article</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
