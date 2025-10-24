
"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { collection, doc, DocumentData, QueryDocumentSnapshot, setDoc, SnapshotOptions, deleteDoc } from "firebase/firestore";
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { useFirebase } from '@/firebase/provider';
import { getAuth } from 'firebase/auth';
import { seedDatabaseAction, createArticleAction, deleteArticleAction, updateArticleAction, createCategoryAction, updateCategoryAction, deleteCategoryAction, getCategorySettingsAction, updateCategorySettingsAction } from '@/app/actions';
import { Article, Category, Comment, User } from '@/lib/server-types';
import { NewArticleData, FullArticle } from '@/lib/types';

// Generic converter to add the document ID to the object
const idConverter = <T,>() => ({
    toFirestore: (data: T) => data as DocumentData,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions) => {
        const data = snapshot.data(options)!;
        return { ...data, id: snapshot.id } as T;
    }
});

// Specific converter for the User type, which doesn't need a separate ID field
const userConverter = <T,>() => ({
    toFirestore: (data: T) => data as DocumentData,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions) => {
        return snapshot.data(options) as T;
    }
});

interface CategorySettings {
    maxDepth: number;
}

interface DataContextType {
    user: User | null;
    articles: FullArticle[];
    categories: Category[];
    comments: Comment[];
    users: User[];
    isLoading: boolean;
    isAdmin: boolean;
    seedDatabase: () => Promise<void>;
    createArticle: (article: NewArticleData) => Promise<{ success: boolean; message: string; slug?: string; }>;
    updateArticle: (articleId: string, article: Partial<Article>) => Promise<{ success: boolean; message: string; slug?: string; }>;
    deleteArticle: (articleId: string) => Promise<{ success: boolean; message: string; }>;
    createCategory: (name: string, parentId: string | null) => Promise<{ success: boolean; message: string; id?: string }>;
    updateCategory: (categoryId: string, newName: string, newParentId: string | null) => Promise<{ success: boolean; message: string; }>;
    deleteCategory: (categoryId: string, newParentIdForChildren: string | null) => Promise<{ success: boolean; message: string; }>;
    getCategorySettings: () => Promise<{ success: boolean; settings?: CategorySettings; message?: string; }>;
    updateCategorySettings: (newSettings: Partial<CategorySettings>) => Promise<{ success: boolean; message: string; }>;
    refreshData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { firestore, user, claims } = useFirebase();
    const isAdmin = useMemo(() => !!claims?.claims.admin, [claims]);
    const [refresh, setRefresh] = useState(0);

    const articlesCollection = useMemo(() => firestore ? collection(firestore, 'articles').withConverter<Article>(idConverter<Article>()) : null, [firestore, refresh]);
    const [articlesSnapshot, articlesLoading] = useCollection(articlesCollection);
    const articles = useMemo(() => articlesSnapshot?.docs.map(doc => doc.data()) || [], [articlesSnapshot]);

    const categoriesCollection = useMemo(() => firestore ? collection(firestore, 'categories').withConverter<Category>(idConverter<Category>()) : null, [firestore, refresh]);
    const [categoriesSnapshot, categoriesLoading] = useCollection(categoriesCollection);
    const categories = useMemo(() => categoriesSnapshot?.docs.map(doc => doc.data()) || [], [categoriesSnapshot]);

    const usersCollection = useMemo(() => firestore ? collection(firestore, 'users').withConverter<User>(userConverter<User>()) : null, [firestore, refresh]);
    const [usersSnapshot, usersLoading] = useCollection(usersCollection);
    const users = useMemo(() => usersSnapshot?.docs.map(doc => doc.data()) || [], [usersSnapshot]);

    const userRef = useMemo(() => user ? doc(firestore!, 'users', user.uid).withConverter<User>(userConverter<User>()) : null, [firestore, user, refresh]);
    const [userSnapshot, userLoading] = useDocument(userRef);
    const userProfile = useMemo(() => userSnapshot?.data() || null, [userSnapshot]);

    const commentsCollection = useMemo(() => firestore ? collection(firestore, 'comments').withConverter<Comment>(idConverter<Comment>()) : null, [firestore, refresh]);
    const [commentsSnapshot, commentsLoading] = useCollection(commentsCollection);
    const comments = useMemo(() => commentsSnapshot?.docs.map(doc => doc.data()) || [], [commentsSnapshot]);

    const fullArticles = useMemo(() => {
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        const userMap = new Map(users.map(u => [u.uid, u.name]));
        return articles.map(article => ({
            ...article,
            categoryName: categoryMap.get(article.categoryId) || 'Unknown Category',
            authorName: userMap.get(article.authorId) || 'Unknown Author',
        }));
    }, [articles, categories, users]);
    
    const createArticle = async (article: NewArticleData) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("You must be logged in to create an article.");
        }
        const token = await currentUser.getIdToken();
        return await createArticleAction(token, article);
    };

    const updateArticle = async (articleId: string, article: Partial<Article>) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("You must be logged in to update an article.");
        }
        const token = await currentUser.getIdToken();
        return await updateArticleAction(token, articleId, article);
    };

    const deleteArticle = async (articleId: string) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("You must be logged in to delete an article.");
        }
        const token = await currentUser.getIdToken();
        return await deleteArticleAction(token, articleId);
    };
  
    const createCategory = async (name: string, parentId: string | null) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("You must be logged in to create a category.");
        }
        const token = await currentUser.getIdToken();
        return await createCategoryAction(token, name, parentId);
    };

    const updateCategory = async (categoryId: string, newName: string, newParentId: string | null) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("You must be logged in to update a category.");
        }
        const token = await currentUser.getIdToken();
        return await updateCategoryAction(token, categoryId, newName, newParentId);
    };

    const deleteCategory = async (categoryId: string, newParentIdForChildren: string | null) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("You must be logged in to delete a category.");
        }
        const token = await currentUser.getIdToken();
        return await deleteCategoryAction(token, categoryId, newParentIdForChildren);
    };

    const getCategorySettings = async () => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("You must be logged in to get settings.");
        }
        const token = await currentUser.getIdToken();
        return await getCategorySettingsAction(token);
    };

    const updateCategorySettings = async (newSettings: Partial<CategorySettings>) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("You must be logged in to update settings.");
        }
        const token = await currentUser.getIdToken();
        return await updateCategorySettingsAction(token, newSettings);
    };

    const seedDatabase = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("You must be logged in to seed the database.");
      }
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
        user: userProfile,
        articles: fullArticles,
        categories,
        comments,
        users,
        isLoading: articlesLoading || categoriesLoading || userLoading || commentsLoading || !user,
        isAdmin,
        seedDatabase,
        createArticle,
        updateArticle,
        deleteArticle,
        createCategory,
        updateCategory,
        deleteCategory,
        getCategorySettings,
        updateCategorySettings,
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
