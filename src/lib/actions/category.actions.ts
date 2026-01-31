
'use server';

import { adminFirestore } from '@/firebase/admin';
import { Article } from '@/lib/types';
import { Category } from '@/lib/server-types';
import { revalidatePath } from 'next/cache';
import { Firestore, QueryDocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import { verifyAdmin } from '@/lib/auth-utils';

// Helper function to create a sanitized category object for Firestore.
function sanitizeCategory(category: Partial<Category>): Omit<Category, 'id' | 'articleCount'> {
    const { name, slug, parentId, description, icon } = category;
    return {
        name: name || '',
        slug: slug || '',
        parentId: parentId !== undefined ? parentId : null,
        description: description || '',
        icon: icon || '',
    };
}

interface CategorySettings {
    maxDepth: number;
}

async function getCategorySettings(): Promise<CategorySettings> {
    const settingsRef = adminFirestore.collection('settings').doc('category');
    const settingsDoc = await settingsRef.get();

    if (settingsDoc.exists) {
        return settingsDoc.data() as CategorySettings;
    }
    
    console.log("Category settings not found. Initializing...");

    try {
        const categoriesSnapshot = await adminFirestore.collection('categories').get();
        const categories = new Map<string, { parentId: string | null }>();
        categoriesSnapshot.forEach((doc: QueryDocumentSnapshot) => {
            const data = doc.data();
            categories.set(doc.id, { parentId: data.parentId });
        });

        const depths = new Map<string, number>();
        function getDepth(catId: string): number {
            if (depths.has(catId)) return depths.get(catId)!;

            const category = categories.get(catId);
            if (!category || !category.parentId) {
                depths.set(catId, 1);
                return 1;
            }
            
            const parentDepth = getDepth(category.parentId);
            const currentDepth = parentDepth + 1;
            depths.set(catId, currentDepth);
            return currentDepth;
        }

        let maxExistingDepth = 0;
        if (!categoriesSnapshot.empty) {
            categories.forEach((_value, key) => {
                maxExistingDepth = Math.max(maxExistingDepth, getDepth(key));
            });
        }
        
        const initialMaxDepth = Math.max(maxExistingDepth, 4);

        const newSettings: CategorySettings = {
            maxDepth: initialMaxDepth
        };

        await settingsRef.set(newSettings);
        console.log(`Initialized category settings with maxDepth of ${initialMaxDepth}.`);
        return newSettings;

    } catch (error) {
        console.error("Catastrophic error during category settings initialization:", error);
        return { maxDepth: 4 };
    }
}

export async function getCategorySettingsAction(authToken: string): Promise<{ success: boolean; settings?: CategorySettings; message?: string }> {
    const { isAdmin, error } = await verifyAdmin(authToken);
    if (!isAdmin) {
        return { success: false, message: error || 'Authorization failed.' };
    }
    
    try {
        const settings = await getCategorySettings();
        return { success: true, settings };
    } catch (error: any) {
        console.error("Error fetching category settings: ", error);
        return { success: false, message: "Failed to fetch settings." };
    }
}

export async function updateCategorySettingsAction(authToken: string, newSettings: Partial<CategorySettings>): Promise<{ success: boolean, message: string }> {
    const { isAdmin, error } = await verifyAdmin(authToken);
    if (!isAdmin) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    try {
        const settingsRef = adminFirestore.collection('settings').doc('category');
        await settingsRef.update(newSettings);
        revalidatePath('/admin/categories');
        return { success: true, message: "Settings updated successfully." };
    } catch (error) {
        console.error("Error updating category settings: ", error);
        return { success: false, message: "Failed to update settings." };
    }
}

async function getCategoryDepth(categoryId: string, db: Firestore): Promise<number> {
    let depth = 0;
    let currentId: string | null = categoryId;
    while (currentId) {
        const doc = await db.collection('categories').doc(currentId).get();
        if (!doc.exists) {
            break;
        }
        const data = doc.data();
        currentId = data?.parentId;
        depth++;
    }
    return depth;
}

export async function createCategoryAction(authToken: string, category: Partial<Category>): Promise<{ success: boolean, message: string, id?: string }> {
    const { isAdmin, error } = await verifyAdmin(authToken);
    if (!isAdmin) {
        return { success: false, message: error || 'Authorization failed.' };
    }

  try {
    if (!category.name || !category.name.trim()) {
        return { success: false, message: 'Category name cannot be empty.' };
    }

    const { maxDepth } = await getCategorySettings();
        
    if (category.parentId) {
        const parentDepth = await getCategoryDepth(category.parentId, adminFirestore);
        if (parentDepth >= maxDepth) {
            return { success: false, message: `Cannot create category. The maximum depth of ${maxDepth} has been reached.` };
        }
    }
    
    const newCategoryData = {
        ...sanitizeCategory(category),
        articleCount: 0, // Always initialize with 0 articles
    };

    const docRef = await adminFirestore.collection('categories').add(newCategoryData);
    revalidatePath('/admin/categories');
    return { success: true, message: 'Category created successfully.', id: docRef.id };
  } catch (error) {
    console.error('Error creating category:', error);
    return { success: false, message: 'Error creating category.' };
  }
}

const getAllCategories = async (transaction?: Transaction): Promise<Category[]> => {
    const collectionRef = adminFirestore.collection('categories');
    const querySnapshot = transaction ? await transaction.get(collectionRef) : await collectionRef.get();
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data()
    } as Category));
}

const getAllDescendantIds = (categoryId: string, allCategories: Category[]): string[] => {
    const children = allCategories.filter(c => c.parentId === categoryId);
    let descendantIds: string[] = children.map(c => c.id);
    for (const child of children) {
        descendantIds = [...descendantIds, ...getAllDescendantIds(child.id, allCategories)];
    }
    return descendantIds;
};

export async function updateCategoryAction(authToken: string, categoryId: string, category: Partial<Category>): Promise<{ success: boolean, message: string }> {
    const { isAdmin, error } = await verifyAdmin(authToken);
    if (!isAdmin) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    try {
        await adminFirestore.runTransaction(async (transaction: Transaction) => {
            const categoryRef = adminFirestore.collection('categories').doc(categoryId);

            // Validation for parent change
            if (category.parentId) {
                if (categoryId === category.parentId) {
                    throw new Error("A category cannot be its own parent.");
                }
                const allCategories = await getAllCategories(transaction);
                const descendantIds = getAllDescendantIds(categoryId, allCategories);
                if (descendantIds.includes(category.parentId)) {
                    throw new Error("A category cannot be moved to be a child of its own descendant.");
                }
            }

            const updateData = sanitizeCategory(category);
            transaction.update(categoryRef, updateData);

            // Find and update all articles in this category
            const articlesQuery = adminFirestore.collection('articles').where('categoryId', '==', categoryId);
            const articlesSnapshot = await transaction.get(articlesQuery);

            if (!articlesSnapshot.empty) {
                const articleUpdatePayload = {
                    categoryName: updateData.name,
                    categorySlug: updateData.slug,
                };
                articlesSnapshot.docs.forEach(doc => {
                    transaction.update(doc.ref, articleUpdatePayload);
                });
            }
        });

        revalidatePath('/admin/categories');
        revalidatePath('/');
        if (category.slug) {
            revalidatePath(`/categories/${category.slug}`);
        }

        return { success: true, message: 'Category updated successfully.' };

    } catch (error: any) {
        console.error('Error updating category:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function deleteCategoryAction(authToken: string, categoryId: string, newParentIdForChildren: string | null): Promise<{ success: boolean, message: string }> {
    const { isAdmin, error } = await verifyAdmin(authToken);
    if (!isAdmin) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    try {
        await adminFirestore.runTransaction(async (transaction: Transaction) => {
            const categoryToDeleteRef = adminFirestore.collection('categories').doc(categoryId);
            const categorySnap = await transaction.get(categoryToDeleteRef);
            if (!categorySnap.exists) {
                throw new Error("Category not found.");
            }

            const categoryData = categorySnap.data() as Category;
            if (categoryData.articleCount && categoryData.articleCount > 0) {
                throw new Error("Cannot delete a category that contains articles. Please move the articles to another category first.");
            }

            const childrenSnapshot = await transaction.get(
                adminFirestore.collection('categories').where('parentId', '==', categoryId)
            );

            childrenSnapshot.docs.forEach(childDoc => {
                transaction.update(childDoc.ref, { parentId: newParentIdForChildren });
            });

            transaction.delete(categoryToDeleteRef);
        });

        revalidatePath('/admin/categories');
        return { success: true, message: 'Category deleted and children reassigned successfully.' };
    } catch (error: any) {
        console.error('Error deleting category:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function batchUpdateCategoriesAction(token: string, initialCategories: Category[], workingCategories: Category[]) {
    const { isAdmin, error } = await verifyAdmin(token);
    if (!isAdmin) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    const changedCategories: {id: string, name: string, slug: string}[] = [];

    try {
        await adminFirestore.runTransaction(async (transaction) => {
            const dbCategories = await getAllCategories(transaction);
            const dbCategoriesMap = new Map(dbCategories.map(c => [c.id, c]));

            const initialIds = new Set(initialCategories.map(c => c.id));
            const workingIds = new Set(workingCategories.map(c => c.id));

            // Deletions
            for (const id of initialIds) {
                if (!workingIds.has(id)) {
                    const categoryToDelete = dbCategoriesMap.get(id);
                    if (categoryToDelete?.articleCount && categoryToDelete.articleCount > 0) {
                        throw new Error(`Cannot delete category "${categoryToDelete.name}" because it contains articles. Please move them first.`);
                    }
                    transaction.delete(adminFirestore.collection('categories').doc(id));
                }
            }

            // Updates and Creations
            const initialCategoriesMap = new Map(initialCategories.map(c => [c.id, c]));
            for (const category of workingCategories) {
                const ref = adminFirestore.collection('categories').doc(category.id);
                const sanitizedData = sanitizeCategory(category);
                const existingCategory = dbCategoriesMap.get(category.id);
                const initialCategory = initialCategoriesMap.get(category.id);

                if (existingCategory) { // Update
                    transaction.set(ref, {
                        ...sanitizedData,
                        articleCount: existingCategory.articleCount
                    });
                    
                    if (initialCategory && (initialCategory.name !== category.name || initialCategory.slug !== category.slug)) {
                        changedCategories.push({id: category.id, name: category.name!, slug: category.slug!});
                    }
                } else { // Create
                    transaction.set(ref, {
                        ...sanitizedData,
                        articleCount: 0
                    });
                }
            }

            // Propagate changes to articles
            for (const changedCategory of changedCategories) {
                const articlesQuery = adminFirestore.collection('articles').where('categoryId', '==', changedCategory.id);
                const articlesSnapshot = await transaction.get(articlesQuery);
                
                if (!articlesSnapshot.empty) {
                    const articleUpdatePayload = {
                        categoryName: changedCategory.name,
                        categorySlug: changedCategory.slug,
                    };
                    articlesSnapshot.docs.forEach(doc => {
                        transaction.update(doc.ref, articleUpdatePayload);
                    });
                }
            }
        });

        revalidatePath('/admin/categories');
        revalidatePath('/');
        changedCategories.forEach(cat => {
            if(cat.slug) revalidatePath(`/categories/${cat.slug}`);
        })

        return { success: true, message: 'Categories updated successfully.' };
    } catch (error: any) {
        console.error('Error in batchUpdateCategoriesAction:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}


export async function getCategoryById(id: string): Promise<Category | null> {
    try {
        const docRef = adminFirestore.collection('categories').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return null;
        }

        return { id: docSnap.id, ...docSnap.data() } as Category;
    } catch (error) {
        console.error(`Error fetching category by ID: ${id}`, error);
        return null;
    }
}
