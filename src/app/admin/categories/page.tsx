'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useData } from '@/components/providers/data-provider';
import { Category, Article } from '@/lib/server-types';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Save, Undo, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { HierarchicalCategory, CategorySettings } from '@/components/admin/categories/types';
import { CategoryItem } from '@/components/admin/categories/CategoryItem';
import { buildHierarchy, findCategory as findCategoryUtil, flattenHierarchy } from '@/components/admin/categories/utils';
import { isEqual } from 'lodash';
import { Alert, AlertDescription } from '@/components/ui/alert';
import IconPicker from '@/components/admin/categories/IconPicker';

const CategoriesPage = () => {
    const { categories: flatDbCategories, articles, batchUpdateCategories, getCategorySettings, updateCategorySettings, refreshData } = useData();
    
    const [initialCategories, setInitialCategories] = useState<HierarchicalCategory[]>([]);
    const [workingCategories, setWorkingCategories] = useState<HierarchicalCategory[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('');
    const [newCategoryParent, setNewCategoryParent] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; slug: string; } | null>(null);
    
    const [settings, setSettings] = useState<CategorySettings>({ maxDepth: 4 });
    const [newMaxDepth, setNewMaxDepth] = useState<number>(4);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const articleCounts = useMemo(() => {
        const counts: { [categoryId: string]: number } = {};
        articles.forEach((article: Article) => {
            if (article.categoryId) {
                counts[article.categoryId] = (counts[article.categoryId] || 0) + 1;
            }
        });
        return counts;
    }, [articles]);

    useEffect(() => {
        const hierarchy = buildHierarchy(flatDbCategories, articleCounts);
        setInitialCategories(hierarchy);
        setWorkingCategories(hierarchy);
    }, [flatDbCategories, articleCounts]);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            const result = await getCategorySettings();
            if (isMounted && result.success && result.settings) {
                setSettings(result.settings);
                setNewMaxDepth(result.settings.maxDepth);
            }
        })();
        return () => { isMounted = false; };
    }, [getCategorySettings]);

    useEffect(() => {
        setIsDirty(!isEqual(initialCategories, workingCategories));
    }, [initialCategories, workingCategories]);

    const findCategory = useCallback((id: string) => {
        return findCategoryUtil(workingCategories, id);
    }, [workingCategories]);

    const moveCategory = useCallback((id: string, atIndex: number, newParentId: string | null) => {
        const { category, index } = findCategoryUtil(workingCategories, id);
        const flat = flattenHierarchy(workingCategories);
        flat.splice(index, 1);
        flat.splice(atIndex, 0, { ...category, parentId: newParentId });
        setWorkingCategories(buildHierarchy(flat, articleCounts));
    }, [workingCategories, articleCounts]);

    const handleCreateCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        const newCat: Omit<HierarchicalCategory, 'children'> = {
            id: `new-${Date.now()}`,
            name: newCategoryName,
            slug: newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
            parentId: newCategoryParent,
            description: newCategoryDescription,
            icon: newCategoryIcon,
            level: 0, // Placeholder level
            articleCount: 0,
        };
        const flat = flattenHierarchy(workingCategories);
        flat.push(newCat as HierarchicalCategory);
        setWorkingCategories(buildHierarchy(flat, articleCounts));
        setNewCategoryName('');
        setNewCategoryDescription('');
        setNewCategoryIcon('');
        setNewCategoryParent(null);
    };

    const handleStartEdit = (category: Category) => {
        setEditingCategory({ id: category.id, name: category.name, slug: category.slug });
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
    };

    const handleUpdateCategory = (editingData: { id: string; name: string; slug: string }) => {
        const updateRecursively = (cats: HierarchicalCategory[]): HierarchicalCategory[] => {
            return cats.map(cat => {
                if (cat.id === editingData.id) {
                    return { ...cat, name: editingData.name, slug: editingData.slug };
                }
                if (cat.children) {
                    return { ...cat, children: updateRecursively(cat.children) };
                }
                return cat;
            });
        };
        setWorkingCategories(updateRecursively(workingCategories));
        handleCancelEdit();
    };
    
    const handleDeleteCategory = (categoryId: string) => {
        const deleteRecursively = (cats: HierarchicalCategory[]): HierarchicalCategory[] => {
            return cats.reduce((acc, cat) => {
                if (cat.id === categoryId) {
                    if (cat.children) {
                        const orphanedChildren = cat.children.map(child => ({...child, parentId: null}));
                        return [...acc, ...orphanedChildren];
                    }
                    return acc;
                }
                if (cat.children) {
                    cat.children = deleteRecursively(cat.children);
                }
                acc.push(cat);
                return acc;
            }, [] as HierarchicalCategory[]);
        };
        setWorkingCategories(deleteRecursively(workingCategories));
    };

    const handleDiscardChanges = () => {
        setWorkingCategories(initialCategories);
        toast({ title: "Changes Discarded", description: "Your changes have been discarded." });
    };

    const handleApplyChanges = async () => {
        setIsSaving(true);
        try {
            const result = await batchUpdateCategories(flattenHierarchy(initialCategories), flattenHierarchy(workingCategories));
            if (result.success) {
                toast({ title: "Success", description: "Categories updated successfully." });
                refreshData();
            } else {
                toast({ title: "Error", description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: 'destructive' });
        }
        setIsSaving(false);
    };
    
    const handleUpdateSettings = async () => {
        setSettingsError(null);
        if (newMaxDepth < currentMaxDepth) {
            setSettingsError(`Cannot set max depth to ${newMaxDepth}. The current category structure is ${currentMaxDepth} levels deep.`);
            return;
        }
        setIsSavingSettings(true);
        try {
            await updateCategorySettings({ maxDepth: newMaxDepth });
            setSettings({ maxDepth: newMaxDepth });
            toast({ title: "Success", description: "Settings updated successfully." });
        } catch (error: any) {
            setSettingsError(error.message || "An unexpected error occurred.");
        }
        setIsSavingSettings(false);
    };

    const flatCategoryList = useMemo(() => flattenHierarchy(workingCategories), [workingCategories]);

    const currentMaxDepth = useMemo(() => {
        if (flatCategoryList.length === 0) return 1;
        return Math.max(...flatCategoryList.map(c => c.level)) + 1;
    }, [flatCategoryList]);

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="flex flex-col gap-6">
                <Card className="w-full">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-2">
                            <div>
                                <CardTitle>Manage Categories</CardTitle>
                                <CardDescription>Drag, drop, and edit to organize your category hierarchy.</CardDescription>
                            </div>
                            <div className="flex gap-2 self-end sm:self-auto">
                                <Button onClick={handleDiscardChanges} disabled={!isDirty || isSaving} variant="outline">
                                    <Undo className="mr-2 h-4 w-4" /> Discard
                                </Button>
                                <Button onClick={handleApplyChanges} disabled={!isDirty || isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Apply Changes
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {workingCategories.map(category => (
                            <CategoryItem
                                key={category.id}
                                category={category}
                                settings={settings}
                                moveCategory={moveCategory}
                                findCategory={findCategory}
                                onUpdate={handleUpdateCategory}
                                onDelete={handleDeleteCategory}
                                onStartEdit={handleStartEdit}
                                onCancelEdit={handleCancelEdit}
                                editingCategory={editingCategory}
                                setEditingCategory={setEditingCategory}
                            />
                        ))}
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add New Category</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateCategory} className="space-y-4">
                                <Input type="text" placeholder="Category Name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                                <Textarea placeholder="Description (optional)" value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} />
                                <IconPicker
                                    value={newCategoryIcon}
                                    onChange={setNewCategoryIcon}
                                    placeholder="Select an icon (optional)"
                                />
                                <Select onValueChange={(value) => setNewCategoryParent(value === "null" ? null : value)} value={newCategoryParent || 'null'}>
                                    <SelectTrigger><SelectValue placeholder="Select Parent (optional)" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="null">None (Top Level)</SelectItem>
                                        {flatCategoryList.filter(c => c.level < settings.maxDepth - 1).map(cat => (
                                            <SelectItem key={cat.id} value={cat.id} style={{ paddingLeft: `${cat.level * 20 + 20}px` }}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button type="submit" disabled={!newCategoryName.trim()} className="w-full"><Plus className="mr-2 h-4 w-4"/> Add Category</Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="max-depth">Max Category Depth</Label>
                                <Input id="max-depth" type="number" min={currentMaxDepth} value={newMaxDepth || ''} onChange={(e) => setNewMaxDepth(parseInt(e.target.value, 10) || 1)} />
                                {settingsError && <p className="text-sm text-red-500">{settingsError}</p>}
                            </div>
                            <Button onClick={handleUpdateSettings} disabled={isSavingSettings} className="w-full">{isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Settings</Button>
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    The current category structure is <strong>{currentMaxDepth}</strong> levels deep. To lower the maximum depth, you must first rearrange the categories into a shallower structure.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DndProvider>
    );
};

export default CategoriesPage;
