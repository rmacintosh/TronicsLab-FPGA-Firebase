'use server';

import { adminFirestore } from '@/firebase/admin';
import { Category } from '@/lib/server-types';
import { revalidatePath } from 'next/cache';
import { Firestore, QueryDocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import { verifyAdmin } from '@/lib/auth-utils'; // CORRECT: Import from the new utility file

// REMOVED: The duplicated verifyAdmin function is no longer here.

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
    // CORRECT: Use the imported verifyAdmin function
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
    // CORRECT: Use the imported verifyAdmin function
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

export async function createCategoryAction(authToken: string, name: string, parentId: string | null, icon?: string): Promise<{ success: boolean, message: string, id?: string }> {
    // CORRECT: Use the imported verifyAdmin function
    const { isAdmin, error } = await verifyAdmin(authToken);
    if (!isAdmin) {
        return { success: false, message: error || 'Authorization failed.' };
    }

  try {
    if (!name.trim()) {
        return { success: false, message: 'Category name cannot be empty.' };
    }

    const { maxDepth } = await getCategorySettings();
        
    if (parentId) {
        const parentDepth = await getCategoryDepth(parentId, adminFirestore);
        if (parentDepth >= maxDepth) {
            return { success: false, message: `Cannot create category. The maximum depth of ${maxDepth} has been reached.` };
        }
    }

    const docRef = await adminFirestore.collection('categories').add({ name, parentId, icon });
    revalidatePath('/admin/categories');
    return { success: true, message: 'Category created successfully.', id: docRef.id };
  } catch (error) {
    console.error('Error creating category:', error);
    return { success: false, message: 'Error creating category.' };
  }
}

const getAllCategories = async (): Promise<Category[]> => {
    const querySnapshot = await adminFirestore.collection('categories').get();
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

export async function updateCategoryAction(authToken: string, categoryId: string, newName: string, newParentId: string | null, newIcon?: string): Promise<{ success: boolean, message: string }> {
    // CORRECT: Use the imported verifyAdmin function
    const { isAdmin, error } = await verifyAdmin(authToken);
    if (!isAdmin) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    try {
        await adminFirestore.runTransaction(async (transaction: Transaction) => {
            if (newParentId) {
                if (categoryId === newParentId) {
                    throw new Error("A category cannot be its own parent.");
                }
                const categoriesSnapshot = await transaction.get(adminFirestore.collection('categories'));
                const allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

                const descendantIds = getAllDescendantIds(categoryId, allCategories);
                if (descendantIds.includes(newParentId)) {
                    throw new Error("A category cannot be moved to be a child of its own descendant.");
                }
            }

            const categoryRef = adminFirestore.collection('categories').doc(categoryId);
            const updateData: { [key: string]: any } = { name: newName, parentId: newParentId };
            if (newIcon) {
                updateData.icon = newIcon;
            }
            transaction.update(categoryRef, updateData);
        });

        revalidatePath('/admin/categories');
        return { success: true, message: 'Category updated successfully.' };

    } catch (error: any) {
        console.error('Error updating category:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function deleteCategoryAction(authToken: string, categoryId: string, newParentIdForChildren: string | null): Promise<{ success: boolean, message: string }> {
    // CORRECT: Use the imported verifyAdmin function
    const { isAdmin, error } = await verifyAdmin(authToken);
    if (!isAdmin) {
        return { success: false, message: error || 'Authorization failed.' };
    }

    try {
        await adminFirestore.runTransaction(async (transaction: Transaction) => {
            const childrenSnapshot = await transaction.get(
                adminFirestore.collection('categories').where('parentId', '==', categoryId)
            );

            childrenSnapshot.docs.forEach(childDoc => {
                transaction.update(childDoc.ref, { parentId: newParentIdForChildren });
            });

            const categoryToDeleteRef = adminFirestore.collection('categories').doc(categoryId);
            transaction.delete(categoryToDeleteRef);
        });

        revalidatePath('/admin/categories');
        return { success: true, message: 'Category deleted and children reassigned successfully.' };
    } catch (error: any) {
        console.error('Error deleting category:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}
