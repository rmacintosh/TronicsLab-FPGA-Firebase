
"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { collection, DocumentData, QueryDocumentSnapshot, SnapshotOptions } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useFirebase } from '@/firebase/provider';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { seedDatabaseAction } from '@/lib/actions/admin.actions';
import { processAndCreateArticleAction, deleteArticleAction, updateArticleAction } from '@/lib/actions/article.actions';
import { createCategoryAction, updateCategoryAction, deleteCategoryAction, getCategorySettingsAction, updateCategorySettingsAction, batchUpdateCategoriesAction } from '@/lib/actions/category.actions';
import { updateUserRolesAction, deleteUserAction } from '@/lib/actions/user.actions';
import { deleteCommentAction } from '@/lib/actions/comment.actions';
import { Article as ServerArticle, Category, Comment, User, UserRole, FullComment as ServerFullComment } from '@/lib/server-types';
import { NewArticleData, Article, FullComment } from '@/lib/types';

const idConverter = <T,>() => ({
    toFirestore: (data: T) => data as DocumentData,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions) => {
        const data = snapshot.data(options)!;
        return { ...data, id: snapshot.id } as T;
    }
});

const userConverter = <T extends { uid: string }>() => ({
    toFirestore: (data: T) => data as DocumentData,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions) => {
        const data = snapshot.data(options);
        return { ...data, uid: snapshot.id } as T;
    }
});

interface CategorySettings {
    maxDepth: number;
}

interface DataContextType {
    user: User | null;
    userRoles: UserRole[];
    isAdmin: boolean;
    articles: Article[];
    categories: Category[];
    comments: FullComment[];
    users: User[];
    isLoading: boolean;
    seedDatabase: () => Promise<void>;
    createArticle: (article: NewArticleData) => Promise<{ success: boolean; message: string; slug?: string; }>;
    updateArticle: (articleId: string, article: Partial<ServerArticle>) => Promise<{ success: boolean; message: string; slug?: string; }>;
    deleteArticle: (articleId: string) => Promise<{ success: boolean; message: string; }>;
    createCategory: (category: Partial<Category>) => Promise<{ success: boolean; message: string; id?: string }>;
    updateCategory: (categoryId: string, category: Partial<Category>) => Promise<{ success: boolean; message: string; }>;
    deleteCategory: (categoryId: string, newParentIdForChildren: string | null) => Promise<{ success: boolean; message: string; }>;
    batchUpdateCategories: (initialCategories: Category[], workingCategories: Category[]) => Promise<{ success: boolean; message: string; }>;
    getCategorySettings: () => Promise<{ success: boolean; settings?: CategorySettings; message?: string; }>;
    updateCategorySettings: (newSettings: Partial<CategorySettings>) => Promise<{ success: boolean; message: string; }>;
    updateUserRoles: (uid: string, role: UserRole) => Promise<{ success: boolean; message: string; }>;
    deleteUser: (uid: string) => Promise<{ success: boolean; message: string; name?: string; }>;
    deleteComment: (commentId: string) => Promise<{ success: boolean; message: string; }>;
    refreshData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { firestore, user: authUser, isUserLoading: isAuthLoading, firestoreUser } = useFirebase();

    const currentUser: User | null = useMemo(() => {
        if (!authUser) {
            return null;
        }

        const userProfile = {
            uid: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || 'Unnamed User',
            photoURL: authUser.photoURL || '/default-avatar.png',
        };

        const userRoles = (firestoreUser?.roles || []) as UserRole[];

        return {
            ...userProfile,
            roles: userRoles,
            createdAt: authUser.metadata.creationTime || new Date().toISOString(),
        };
    }, [authUser, firestoreUser]);

    const { userRoles, isAdmin } = useMemo(() => {
        if (!currentUser) {
            return { userRoles: [], isAdmin: false };
        }
        const roles = currentUser.roles || [];
        const isAdminResult = roles.includes('admin');
        return { userRoles: roles, isAdmin: isAdminResult };
    }, [currentUser]);

    const [refresh, setRefresh] = useState(0);

    const articlesCollection = useMemo(() => firestore ? collection(firestore, 'articles').withConverter<ServerArticle>(idConverter<ServerArticle>()) : null, [firestore, refresh]);
    const [articlesSnapshot, articlesLoading] = useCollection(articlesCollection);
    const serverArticles = useMemo(() => articlesSnapshot?.docs.map(doc => doc.data()) || [], [articlesSnapshot]);

    const categoriesCollection = useMemo(() => firestore ? collection(firestore, 'categories').withConverter<Category>(idConverter<Category>()) : null, [firestore, refresh]);
    const [categoriesSnapshot, categoriesLoading] = useCollection(categoriesCollection);
    const categories = useMemo(() => categoriesSnapshot?.docs.map(doc => doc.data()) || [], [categoriesSnapshot]);

    const usersCollection = useMemo(() => firestore ? collection(firestore, 'users').withConverter<User>(userConverter<User>()) : null, [firestore, refresh]);
    const [usersSnapshot, usersLoading] = useCollection(usersCollection);
    const users = useMemo(() => usersSnapshot?.docs.map(doc => doc.data()) || [], [usersSnapshot]);

    const commentsCollection = useMemo(() => firestore ? collection(firestore, 'comments').withConverter<Comment>(idConverter<Comment>()) : null, [firestore, refresh]);
    const [commentsSnapshot, commentsLoading] = useCollection(commentsCollection);
    const comments = useMemo(() => commentsSnapshot?.docs.map(doc => doc.data()) || [], [commentsSnapshot]);

    const articles: Article[] = useMemo(() => {
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        return serverArticles.map(article => {
            return {
                ...article,
                authorName: article.authorName || 'Unknown Author',
                category: categoryMap.get(article.categoryId) || 'Unknown Category',
            };
        });
    }, [serverArticles, categories]);

    const fullComments: FullComment[] = useMemo(() => {
        const articleMap = new Map(serverArticles.map(a => [a.id, a.title]));
        return comments.map(comment => ({
            ...comment,
            articleTitle: articleMap.get(comment.articleId) || 'Unknown Article',
            authorName: comment.authorName || 'Unknown Author',
            createdAt: (comment.createdAt as any).toDate().toISOString(),
        }));
    }, [comments, serverArticles]);
    
    const createArticle = async (article: NewArticleData) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to create an article.");
        const token = await currentUser.getIdToken();
        return await processAndCreateArticleAction(token, article);
    };

    const updateArticle = async (articleId: string, article: Partial<ServerArticle>) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to update an article.");
        const token = await currentUser.getIdToken();
        return await updateArticleAction(token, articleId, article);
    };

    const deleteArticle = async (articleId: string) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to delete an article.");
        const token = await currentUser.getIdToken();
        return await deleteArticleAction(token, articleId);
    };

    const deleteComment = async (commentId: string) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to delete a comment.");
        const token = await currentUser.getIdToken();
        return await deleteCommentAction(token, commentId);
    };
  
    const createCategory = async (category: Partial<Category>) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to create a category.");
        const token = await currentUser.getIdToken();
        return await createCategoryAction(token, category);
    };

    const updateCategory = async (categoryId: string, category: Partial<Category>) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to update a category.");
        const token = await currentUser.getIdToken();
        return await updateCategoryAction(token, categoryId, category);
    };

    const deleteCategory = async (categoryId: string, newParentIdForChildren: string | null) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to delete a category.");
        const token = await currentUser.getIdToken();
        return await deleteCategoryAction(token, categoryId, newParentIdForChildren);
    };

    const batchUpdateCategories = async (initialCategories: Category[], workingCategories: Category[]) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to update categories.");
        const token = await currentUser.getIdToken();
        const result = await batchUpdateCategoriesAction(token, initialCategories, workingCategories);

        if (result.success) {
            // Find categories whose name or slug have changed
            const changedCategories = workingCategories.filter(currentCat => {
                if (currentCat.id.startsWith('new-')) return false;
                const initialCat = initialCategories.find(c => c.id === currentCat.id);
                return initialCat && (initialCat.name !== currentCat.name || initialCat.slug !== currentCat.slug);
            });

            if (changedCategories.length > 0) {
                try {
                    const functions = getFunctions();
                    const updateCategoryArticles = httpsCallable(functions, 'updateCategoryArticles');
                    await updateCategoryArticles({ changedCategories });
                } catch (error) {
                    console.error('Error calling updateCategoryArticles function:', error);
                    // Return a partial success with a warning
                    return { 
                        ...result, 
                        message: "Categories saved, but updating associated articles failed. Please check articles manually." 
                    };
                }
            }
        }

        return result;
    };

    const getCategorySettings = async () => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to get settings.");
        const token = await currentUser.getIdToken();
        return await getCategorySettingsAction(token);
    };

    const updateCategorySettings = async (newSettings: Partial<CategorySettings>) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to update settings.");
        const token = await currentUser.getIdToken();
        return await updateCategorySettingsAction(token, newSettings);
    };

    const updateUserRoles = async (uid: string, role: UserRole) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to update user roles.");
        const token = await currentUser.getIdToken();
        return await updateUserRolesAction(token, uid, role);
    };

    const deleteUser = async (uid: string) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("You must be logged in to delete a user.");
        const token = await currentUser.getIdToken();
        return await deleteUserAction(token, uid);
    };

    const seedDatabase = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("You must be logged in to seed the database.");
      const token = await currentUser.getIdToken();
      const result = await seedDatabaseAction(token);
      if (!result.success) {
        throw new Error(result.message);
      }
    };

    const refreshData = useCallback(() => {
        setRefresh(r => r + 1);
    }, []);

    const value: DataContextType = {
        user: currentUser,
        userRoles,
        isAdmin,
        articles,
        categories,
        comments: fullComments,
        users,
        isLoading: isAuthLoading || articlesLoading || categoriesLoading || usersLoading || commentsLoading,
        seedDatabase,
        createArticle,
        updateArticle,
        deleteArticle,
        deleteComment,
        createCategory,
        updateCategory,
        deleteCategory,
        batchUpdateCategories,
        getCategorySettings,
        updateCategorySettings,
        updateUserRoles,
        deleteUser,
        refreshData,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
