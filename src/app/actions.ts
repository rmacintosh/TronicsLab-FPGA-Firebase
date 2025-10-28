
'use server';

import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import { adminFirestore } from '@/firebase/admin';
import { Article, Category, User, UserRole } from '../lib/server-types';
import { NewArticleData } from '../lib/types';
import { JSDOM } from 'jsdom';
import { bundledLanguages, createHighlighter, Highlighter } from 'shiki';
import { revalidatePath } from 'next/cache';
import { Firestore, QueryDocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Create a single highlighter instance promise that can be reused.
const highlighterPromise: Promise<Highlighter> = createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: Object.keys(bundledLanguages),
});

interface CategorySettings {
    maxDepth: number;
}

// Helper to check for required roles
const hasRequiredRole = (decodedToken: any, requiredRoles: UserRole[]): boolean => {
  const userRoles = decodedToken.roles || [];
  return requiredRoles.some(role => userRoles.includes(role));
};

// A server action to get syntax-highlighted HTML.
export async function getHighlightedHtml(html: string): Promise<string> {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const codeBlocks = document.querySelectorAll('pre > code');
  
  // Await the single highlighter instance.
  const highlighter = await highlighterPromise;

  for (const codeBlock of codeBlocks) {
    const preElement = codeBlock.parentElement as HTMLPreElement;
    const lang = codeBlock.className.replace('language-','');
    const code = codeBlock.textContent || '';
    
    try {
        const highlightedCode = highlighter.codeToHtml(code, {
          lang,
          themes: {
            light: 'github-light',
            dark: 'github-dark',
          }
        });
        preElement.outerHTML = highlightedCode;
    } catch (e) {
        console.error(`Shiki highlighting failed for lang: '${lang}'`, e);
    }
  }

  return document.body.innerHTML;
}

// A server action to seed the Firestore database with a new hierarchical structure.
export async function seedDatabaseAction(authToken: string): Promise<{ success: boolean; message: string }> {
  if (!authToken) {
    return {
      success: false,
      message: 'Authentication required. No auth token provided.',
    };
  }

  try {
    const adminAuth = getAuth(getApps()[0]);
    const decodedToken = await adminAuth.verifyIdToken(authToken);

    if (!hasRequiredRole(decodedToken, ['admin'])) {
       return {
         success: false,
         message: 'Authorization required. You must be an admin to perform this action.',
       };
    }

    const firestoreAdmin = adminFirestore;
    const batch = firestoreAdmin.batch();

    // Clear existing data
    const collectionsToDelete = ['articles', 'categories', 'users'];
    for (const collectionName of collectionsToDelete) {
        const snapshot = await firestoreAdmin.collection(collectionName).get();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
    }

    // 1. Define Author from the calling user
    const userEmail = decodedToken.email || 'admin@example.com';
    const userName = decodedToken.name || userEmail.split('@')[0];

    const author: Omit<User, 'id'> = {
        uid: decodedToken.uid,
        name: userName,
        email: userEmail,
        avatar: decodedToken.picture || '/default-avatar.png',
        roles: ['admin'], // The user running this action is an admin
    };

    const authorRef = firestoreAdmin.collection('users').doc(decodedToken.uid);
    batch.set(authorRef, author);

    // 2. Define Categories with Hierarchy
    const cat_fpgaDev: Category = {
      id: 'fpga-development',
      name: 'FPGA Development',
      slug: 'fpga-development',
      parentId: null,
      description: 'Learn the fundamentals and advanced topics in FPGA design and development.',
    };

    const subcat_verilog: Category = {
      id: 'verilog-hdl',
      name: 'Verilog HDL',
      slug: 'verilog-hdl',
      parentId: cat_fpgaDev.id,
      description: 'Master the Verilog Hardware Description Language for digital design.',
    };

    const subcat_vhdl: Category = {
      id: 'vhdl',
      name: 'VHDL',
      slug: 'vhdl',
      parentId: cat_fpgaDev.id,
      description: 'Explore the VHDL language for creating robust hardware systems.',
    };
    
    const subcat2_fsm: Category = {
      id: 'fsm-design',
      name: 'FSM Design',
      slug: 'fsm-design',
      parentId: subcat_verilog.id,
      description: 'Dive deep into designing and implementing Finite State Machines.',
    };

    const initialCategories: Category[] = [cat_fpgaDev, subcat_verilog, subcat_vhdl, subcat2_fsm];

    // 3. Define Articles and link them using categoryId
    const initialArticles: Omit<Article, 'id'>[] = [
      {
        slug: 'fpga-basics-a-beginners-guide',
        title: "FPGA Basics: A Beginner's Guide",
        description: "Learn the fundamentals of FPGAs, their architecture, and how they differ from traditional processors.",
        categoryId: cat_fpgaDev.id,
        authorId: decodedToken.uid,
        date: '2024-01-15T10:00:00.000Z',
        views: 1250,
        image: { id: 'fpga-basics', imageUrl: '/placeholder-images/fpga-basics.png', imageHint: 'A close-up of a complex FPGA chip with glowing circuits.' },
        content: '<p>Field-Programmable Gate Arrays (FPGAs) are a fascinating type of integrated circuit that can be configured by a designer after manufacturing...</p>',
      },
      {
        slug: 'your-first-verilog-project-hello-world',
        title: "Your First Verilog Project: Hello, World!",
        description: "A step-by-step tutorial to create your first Verilog project, the classic \"Hello, World!\" of hardware.",
        categoryId: subcat_verilog.id,
        authorId: decodedToken.uid,
        date: '2024-02-02T14:30:00.000Z',
        views: 980,
        image: { id: 'verilog-hello-world', imageUrl: '/placeholder-images/verilog-hello-world.png', imageHint: 'A computer screen showing simple Verilog code.' },
        content: '<p>Let\'s get started with your first Verilog project. We\'ll create a simple module that outputs a constant value...</p>',
      },
      {
        slug: 'advanced-fsm-design-for-complex-protocols',
        title: "Advanced FSM Design for Complex Protocols",
        description: "Dive deep into finite state machine design for implementing complex communication protocols on an FPGA.",
        categoryId: subcat2_fsm.id,
        authorId: decodedToken.uid,
        date: '2024-03-10T09:00:00.000Z',
        views: 2100,
        image: { id: 'advanced-fsm', imageUrl: '/placeholder-images/advanced-fsm.png', imageHint: 'An abstract diagram of a complex finite state machine.' },
        content: '<p>Finite State Machines (FSMs) are a cornerstone of digital design. In this article, we\'ll explore how to use them to implement a simple UART transmitter.</p>',
      },
    ];

    // 4. Batch write to Firestore
    initialCategories.forEach(category => {
      const categoryRef = firestoreAdmin.collection('categories').doc(category.id);
      batch.set(categoryRef, category);
    });

    initialArticles.forEach(article => {
      const articleRef = firestoreAdmin.collection('articles').doc(article.slug);
      batch.set(articleRef, article);
    });

    await batch.commit();

    return { success: true, message: 'Database seeded successfully with new hierarchical data!' };

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to seed database: ${error.message}`,
    };
  }
}

export async function uploadImageAction(authToken: string, formData: FormData): Promise<{ success: boolean; message: string; url?: string }> {
  if (!authToken) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const adminAuth = getAuth(getApps()[0]);
    const decodedToken = await adminAuth.verifyIdToken(authToken);

    if (!hasRequiredRole(decodedToken, ['admin', 'author'])) {
      return { success: false, message: 'Authorization required. Must be an admin or author.' };
    }

    const file = formData.get('image') as File;
    if (!file) {
      return { success: false, message: 'No image file provided.' };
    }

    const imageDir = join(process.cwd(), 'public', 'images');
    await mkdir(imageDir, { recursive: true });

    const byteLength = await file.arrayBuffer().then(buffer => buffer.byteLength);
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = join(imageDir, file.name);
    await writeFile(path, buffer);

    return { success: true, message: 'Image uploaded successfully!', url: `/images/${file.name}` };
  } catch (error: any) {
    console.error('Error in uploadImageAction:', error);
    return { success: false, message: `Failed to upload image: ${error.message}` };
  }
}

export async function createArticleAction(
  authToken: string,
  articleData: NewArticleData
): Promise<{ success: boolean; message: string; slug?: string }> {
  if (!authToken) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const adminAuth = getAuth(getApps()[0]);
    const decodedToken = await adminAuth.verifyIdToken(authToken);

    if (!hasRequiredRole(decodedToken, ['admin', 'author'])) {
      return { success: false, message: 'Authorization required. Must be an admin or author.' };
    }

    const firestoreAdmin = adminFirestore;

    // Validate that the category exists
    const categoryRef = firestoreAdmin.collection('categories').doc(articleData.categoryId);
    const categorySnap = await categoryRef.get();
    if (!categorySnap.exists) {
      return { success: false, message: 'The specified category does not exist.' };
    }

    const articleRef = firestoreAdmin.collection('articles').doc(articleData.slug);

    const finalArticleData: Omit<Article, 'id'> = {
      slug: articleData.slug,
      title: articleData.title,
      description: articleData.description,
      categoryId: articleData.categoryId,
      authorId: decodedToken.uid,
      date: new Date().toISOString(),
      views: 0,
      image: articleData.image,
      content: articleData.content,
    };

    await articleRef.set(finalArticleData);

    revalidatePath("/admin/articles");
    revalidatePath(`/articles/${articleData.slug}`);

    return { success: true, message: 'Article created successfully!', slug: articleData.slug };
  } catch (error: any) {
    console.error('Error in createArticleAction:', error);
    return { success: false, message: `Failed to create article: ${error.message}` };
  }
}

export async function updateArticleAction(
  authToken: string,
  articleId: string,
  articleData: Partial<Article>
): Promise<{ success: boolean; message: string; slug?: string }> {
  if (!authToken) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const adminAuth = getAuth(getApps()[0]);
    const decodedToken = await adminAuth.verifyIdToken(authToken);

    if (!hasRequiredRole(decodedToken, ['admin', 'author'])) {
      return { success: false, message: 'Authorization required. Must be an admin or author.' };
    }

    const firestoreAdmin = adminFirestore;
    const articleRef = firestoreAdmin.collection('articles').doc(articleId);

    await articleRef.update(articleData);

    revalidatePath("/admin/articles");
    if (articleData.slug) {
      revalidatePath(`/articles/${articleData.slug}`);
    }

    return { success: true, message: 'Article updated successfully!', slug: articleData.slug };
  } catch (error: any) {
    console.error('Error in updateArticleAction:', error);
    return { success: false, message: `Failed to update article: ${error.message}` };
  }
}

export async function deleteArticleAction(
  authToken: string,
  articleId: string
): Promise<{ success: boolean; message: string }> {
  if (!authToken) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const adminAuth = getAuth(getApps()[0]);
    const decodedToken = await adminAuth.verifyIdToken(authToken);

    if (!hasRequiredRole(decodedToken, ['admin', 'author'])) {
      return { success: false, message: 'Authorization required. Must be an admin or author.' };
    }

    const firestoreAdmin = adminFirestore;
    const articleRef = firestoreAdmin.collection('articles').doc(articleId);
    
    await articleRef.delete();

    revalidatePath("/admin/articles");

    return { success: true, message: 'Article deleted successfully!' };
  } catch (error: any) {
    console.error('Error in deleteArticleAction:', error);
    return { success: false, message: `Failed to delete article: ${error.message}` };
  }
}

export async function deleteCommentAction(authToken: string, commentId: string): Promise<{ success: boolean, message: string }> {
    if (!authToken) {
        return { success: false, message: 'Authentication required.' };
    }

    try {
        const adminAuth = getAuth(getApps()[0]);
        const decodedToken = await adminAuth.verifyIdToken(authToken);

        if (!hasRequiredRole(decodedToken, ['admin', 'moderator'])) {
            return { success: false, message: 'Authorization required. Must be an admin or moderator.' };
        }

        const firestoreAdmin = adminFirestore;
        const commentRef = firestoreAdmin.collection('comments').doc(commentId);
        await commentRef.delete();

        revalidatePath('/admin/comments');

        return { success: true, message: 'Comment deleted successfully!' };
    } catch (error: any) {
        console.error('Error in deleteCommentAction:', error);
        return { success: false, message: `Failed to delete comment: ${error.message}` };
    }
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
        return { maxDepth: 4 }; // Failsafe default
    }
}

export async function getCategorySettingsAction(authToken: string): Promise<{ success: boolean; settings?: CategorySettings; message?: string }> {
    if (!authToken) {
        return { success: false, message: 'Authentication required.' };
    }
    try {
        const adminAuth = getAuth(getApps()[0]);
        const decodedToken = await adminAuth.verifyIdToken(authToken);

        if (!hasRequiredRole(decodedToken, ['admin'])) {
            return { success: false, message: 'Authorization required. Must be an admin.' };
        }

        const settings = await getCategorySettings();
        return { success: true, settings };
    } catch (error: any) {
        console.error("Error fetching category settings: ", error);
        return { success: false, message: "Failed to fetch settings." };
    }
}


export async function updateCategorySettingsAction(authToken: string, newSettings: Partial<CategorySettings>) {
    if (!authToken) {
        return { success: false, message: 'Authentication required.' };
    }

    try {
        const adminAuth = getAuth(getApps()[0]);
        const decodedToken = await adminAuth.verifyIdToken(authToken);

        if (!hasRequiredRole(decodedToken, ['admin'])) {
            return { success: false, message: 'Authorization required. Must be an admin.' };
        }

        const settingsRef = adminFirestore.collection('settings').doc('category');
        await settingsRef.update(newSettings);
        revalidatePath('/admin/categories'); // Revalidate the page to show new settings
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

export async function createCategoryAction(authToken: string, name: string, parentId: string | null) {
  if (!authToken) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const adminAuth = getAuth(getApps()[0]);
    const decodedToken = await adminAuth.verifyIdToken(authToken);

    if (!hasRequiredRole(decodedToken, ['admin'])) {
      return { success: false, message: 'Authorization required. Must be an admin.' };
    }

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

    const docRef = await adminFirestore.collection('categories').add({ name, parentId });
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

export async function updateCategoryAction(authToken: string, categoryId: string, newName: string, newParentId: string | null) {
    if (!authToken) {
        return { success: false, message: 'Authentication required.' };
    }

    try {
        const adminAuth = getAuth(getApps()[0]);
        const decodedToken = await adminAuth.verifyIdToken(authToken);

        if (!hasRequiredRole(decodedToken, ['admin'])) {
            return { success: false, message: 'Authorization required. Must be an admin.' };
        }

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
            transaction.update(categoryRef, { name: newName, parentId: newParentId });
        });

        revalidatePath('/admin/categories');
        return { success: true, message: 'Category updated successfully.' };

    } catch (error: any) {
        console.error('Error updating category:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function deleteCategoryAction(authToken: string, categoryId: string, newParentIdForChildren: string | null) {
    if (!authToken) {
        return { success: false, message: 'Authentication required.' };
    }

    try {
        const adminAuth = getAuth(getApps()[0]);
        const decodedToken = await adminAuth.verifyIdToken(authToken);

        if (!hasRequiredRole(decodedToken, ['admin'])) {
            return { success: false, message: 'Authorization required. Must be an admin.' };
        }

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

export async function updateUserRolesAction(authToken: string, uid: string, roles: UserRole[]): Promise<{ success: boolean; message: string }> {
  if (!authToken) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const adminAuth = getAuth(getApps()[0]);
    const decodedToken = await adminAuth.verifyIdToken(authToken);

    if (!hasRequiredRole(decodedToken, ['admin'])) {
      return { success: false, message: 'Authorization required. Must be an admin.' };
    }

    if (decodedToken.uid === uid) {
      return { success: false, message: 'Cannot change your own roles.' };
    }

    await adminAuth.setCustomUserClaims(uid, { roles });

    const userRef = adminFirestore.collection('users').doc(uid);
    await userRef.update({ roles });

    revalidatePath('/admin/users');

    return { success: true, message: 'User roles updated successfully.' };
  } catch (error: any) {
    console.error('Error updating user roles:', error);
    return { success: false, message: `Failed to update user roles: ${error.message}` };
  }
}

export async function deleteUserAction(authToken: string, uid: string): Promise<{ success: boolean; message: string }> {
  if (!authToken) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const adminAuth = getAuth(getApps()[0]);
    const decodedToken = await adminAuth.verifyIdToken(authToken);

    if (!hasRequiredRole(decodedToken, ['admin'])) {
      return { success: false, message: 'Authorization required. Must be an admin.' };
    }

    if (decodedToken.uid === uid) {
      return { success: false, message: 'Cannot delete your own account.' };
    }

    await adminAuth.deleteUser(uid);

    const userRef = adminFirestore.collection('users').doc(uid);
    await userRef.delete();

    revalidatePath('/admin/users');

    return { success: true, message: 'User deleted successfully.' };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, message: `Failed to delete user: ${error.message}` };
  }
}
