'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/components/providers/data-provider';
import { Category } from '@/lib/server-types';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"

interface HierarchicalCategory extends Category {
  children: HierarchicalCategory[];
  level: number;
}

interface CategorySettings {
    maxDepth: number;
}

const CategoriesPage = () => {
  const { categories: flatCategories, createCategory, updateCategory, deleteCategory, getCategorySettings, updateCategorySettings, refreshData } = useData();
  const [hierarchicalCategories, setHierarchicalCategories] = useState<HierarchicalCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const [settings, setSettings] = useState<CategorySettings>({ maxDepth: 4 });
  const [newMaxDepth, setNewMaxDepth] = useState<number>(4);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const result = await getCategorySettings();
      if (result.success && result.settings) {
        setSettings(result.settings);
        setNewMaxDepth(result.settings.maxDepth);
      } else {
        toast({ title: "Error", description: result.message || "Failed to fetch settings.", variant: 'destructive' });
      }
    };
    fetchSettings();
  }, [getCategorySettings]);

  useEffect(() => {
    setLoading(true);
    const buildHierarchy = (items: Category[]): HierarchicalCategory[] => {
        const categoryMap: { [key: string]: HierarchicalCategory } = {};
        items.forEach(cat => {
            categoryMap[cat.id] = { ...cat, children: [], level: 0 };
        });

        const topLevelCategories: HierarchicalCategory[] = [];
        items.forEach(cat => {
            if (cat.parentId && categoryMap[cat.parentId]) {
                categoryMap[cat.parentId].children.push(categoryMap[cat.id]);
            } else {
                topLevelCategories.push(categoryMap[cat.id]);
            }
        });

        function setLevels(categories: HierarchicalCategory[], level = 0) {
            categories.forEach(cat => {
                cat.level = level;
                if (cat.children.length > 0) {
                  setLevels(cat.children, level + 1);
                }
            });
        }

        setLevels(topLevelCategories);
        return topLevelCategories;
    }

    setHierarchicalCategories(buildHierarchy(flatCategories));
    setLoading(false);
  }, [flatCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      return;
    }
    try {
        const result = await createCategory(newCategoryName, newCategoryParent, newCategoryIcon);
        if (result.success) {
            toast({ title: "Success", description: "Category created successfully." });
            setNewCategoryName('');
            setNewCategoryParent(null);
            setShowCreateForm(false);
            refreshData();
        } else {
            toast({ title: "Error", description: result.message, variant: 'destructive' });
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: 'destructive' });
    }
  };

  const handleStartEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleSaveEdit = async (categoryId: string) => {
    if (!editingCategoryName.trim()) {
        toast({ title: "Error", description: "Category name cannot be empty.", variant: 'destructive' });
        return;
    }
    try {
        const category = flatCategories.find(c => c.id === categoryId);
        if (!category) return;

        const result = await updateCategory(categoryId, editingCategoryName, category.parentId);
        if (result.success) {
            toast({ title: "Success", description: "Category updated successfully." });
            handleCancelEdit();
            refreshData();
        } else {
            toast({ title: "Error", description: result.message, variant: 'destructive' });
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: 'destructive' });
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
        const result = await deleteCategory(categoryId, null); // Moving children to root
        if (result.success) {
            toast({ title: "Success", description: "Category deleted successfully." });
            refreshData();
        } else {
            toast({ title: "Error", description: result.message, variant: 'destructive' });
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: 'destructive' });
    }
  };
  
  const handleUpdateSettings = async () => {
    setSettingsError(null);
    setIsSaving(true);

    const maxExistingDepth = Math.max(...flatCategoryList.map(c => c.level + 1), 0);
    if (newMaxDepth < maxExistingDepth) {
      setSettingsError(`Current category depth is ${maxExistingDepth}. Minimum value is ${maxExistingDepth}.`);
      setIsSaving(false);
      return;
    }

    try {
        const result = await updateCategorySettings({ maxDepth: newMaxDepth });
        if (result.success) {
            setSettings({ maxDepth: newMaxDepth });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
            toast({ title: "Success", description: "Settings updated successfully." });
        } else {
            setSettingsError(result.message || 'Failed to update settings.');
            setNewMaxDepth(settings.maxDepth);
            toast({ title: "Error", description: result.message, variant: 'destructive' });
        }
    } catch (error: any) {
        setSettingsError(error.message || "An unexpected error occurred.");
        toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: 'destructive' });
    }

    setIsSaving(false);
  };

  const flatCategoryList = useMemo(() => {
    const list: (Category & { level: number })[] = [];
    const generateFlatList = (cats: HierarchicalCategory[], level = 0) => {
        cats.forEach(cat => {
            list.push({ ...cat, level });
            if (cat.children) {
                generateFlatList(cat.children, level + 1);
            }
        });
    };
    generateFlatList(hierarchicalCategories);
    return list;
  }, [hierarchicalCategories]);
  
  const filteredCategoryList = useMemo(() => {
    return flatCategoryList.filter(cat => cat.level < settings.maxDepth - 1);
  }, [flatCategoryList, settings.maxDepth]);


  const renderCategory = (category: HierarchicalCategory) => {
    const isEditing = editingCategoryId === category.id;

    return (
      <div key={category.id} style={{ marginLeft: `${category.level * 20}px` }} className="group">
        <div className="flex items-center justify-between p-2 border-b">
          {isEditing ? (
            <Input
              type="text"
              value={editingCategoryName}
              onChange={(e) => setEditingCategoryName(e.target.value)}
              className="flex-grow mr-2"
              autoFocus
            />
          ) : (
             <div className="flex items-center">
              {category.icon && <i className={`lucide lucide-${category.icon} w-4 h-4 mr-2`} />} 
              <span>{category.name}</span>
            </div>
          )}

          <div className='flex items-center'>
            {isEditing ? (
              <>
                <Button
                  onClick={() => handleSaveEdit(category.id)}
                  variant='ghost'
                  size='sm'
                  className="mr-2 w-16"
                >
                  Save
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  variant='ghost'
                  size='sm'
                  className="w-16"
                >
                  Cancel
                </Button>
              </>
            ) : (
                <div className="flex justify-end gap-2">
                    <Button
                    onClick={() => handleStartEdit(category)}
                    variant='outline'
                    size='xs'
                    className="w-16"
                    >
                    Edit
                    </Button>
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size='xs' className="w-16">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the category &quot;{category.name}&quot; and move all its children to the top level.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(category.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
          </div>
        </div>
        {category.children.map(renderCategory)}
      </div>
    );
  };

  if (loading) {
    return <div>Loading categories...</div>;
  }

  return (
    <div>
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Category Settings</CardTitle>
            </CardHeader>
            <CardContent>
                <div>
                    <div className="flex items-center">
                        <label htmlFor="maxDepth" className="block text-sm font-medium mr-2">Max Category Depth</label>
                        <Input
                            type="number"
                            id="maxDepth"
                            value={newMaxDepth}
                            onChange={(e) => {
                                setSettingsError(null);
                                setNewMaxDepth(parseInt(e.target.value, 10));
                            }}
                            className="w-20"
                        />
                        <Button
                            onClick={handleUpdateSettings}
                            disabled={isSaving || showSuccess}
                            className="ml-4"
                        >
                            {isSaving ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                            ) : showSuccess ? (
                                <><Check className="mr-2 h-4 w-4" /> Saved!</>
                            ) : (
                                'Save Settings'
                            )}
                        </Button>
                    </div>
                    {settingsError && (
                        <p className="mt-2 text-sm text-red-600">{settingsError}</p>
                    )}
                </div>
            </CardContent>
        </Card>

      {showCreateForm && (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle>Create New Category</CardTitle>
            </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCategory}>
              <div className="mb-4">
                <label htmlFor="categoryName" className="block text-sm font-medium mb-1">Category Name</label>
                <Input
                  type="text"
                  id="categoryName"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="categoryIcon" className="block text-sm font-medium mb-1">Category Icon</label>
                <Input
                  type="text"
                  id="categoryIcon"
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="parentCategory" className="block text-sm font-medium mb-1">Parent Category</label>
                <Select onValueChange={(value) => setNewCategoryParent(value === "null" ? null : value)} value={newCategoryParent || 'null'}>
                    <SelectTrigger>
                    <SelectValue placeholder="None (Top Level)" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="null">None (Top Level)</SelectItem>
                    {filteredCategoryList.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                        {' '.repeat(cat.level * 4)}
                        {cat.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={!newCategoryName.trim()}
              >
                Create Category
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Manage Categories</CardTitle>
                    <Button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                    >
                        {showCreateForm ? 'Cancel' : 'Add New Category'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {hierarchicalCategories.map(renderCategory)}
            </CardContent>
        </Card>
    </div>
  );
};

export default CategoriesPage;
