
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
        const result = await createCategory(newCategoryName, newCategoryParent);
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
        // Assuming updateCategory is flexible enough to only update the name
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
            <input
              type="text"
              value={editingCategoryName}
              onChange={(e) => setEditingCategoryName(e.target.value)}
              className="flex-grow mr-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              autoFocus
            />
          ) : (
            <span>{category.name}</span>
          )}

          <div>
            {isEditing ? (
              <>
                <button
                  onClick={() => handleSaveEdit(category.id)}
                  className="text-green-500 hover:underline mr-2"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-500 hover:underline"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleStartEdit(category)}
                  className="text-blue-500 hover:underline mr-2"
                >
                  Edit
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-red-500 hover:underline">Delete</button>
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
              </>
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
    <div className="container mx-auto p-4">
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-xl font-bold mb-4">Category Settings</h2>
        <div>
            <div className="flex items-center">
                <label htmlFor="maxDepth" className="block text-sm font-medium text-gray-700 mr-2">Max Category Depth</label>
                <input
                    type="number"
                    id="maxDepth"
                    value={newMaxDepth}
                    onChange={(e) => {
                        setSettingsError(null);
                        setNewMaxDepth(parseInt(e.target.value, 10));
                    }}
                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
      </div>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Categories</h1>
        <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            {showCreateForm ? 'Cancel' : 'Add New Category'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <form onSubmit={handleCreateCategory}>
            <div className="mb-4">
              <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">Category Name</label>
              <input
                type="text"
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="parentCategory" className="block text-sm font-medium text-gray-700">Parent Category</label>
              <select
                id="parentCategory"
                value={newCategoryParent || ''}
                onChange={(e) => setNewCategoryParent(e.target.value || null)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">None (Top Level)</option>
                {filteredCategoryList.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {'\u00A0'.repeat(cat.level * 4)}
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={!newCategoryName.trim()}
            >
              Create Category
            </button>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        {hierarchicalCategories.map(renderCategory)}
      </div>
    </div>
  );
};

export default CategoriesPage;
