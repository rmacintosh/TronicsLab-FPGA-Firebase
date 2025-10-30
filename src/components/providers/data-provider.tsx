
"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { collection, doc, DocumentData, QueryDocumentSnapshot, setDoc, SnapshotOptions, deleteDoc } from "firebase/firestore";
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { useFirebase } from '@/firebase/provider';
import { getAuth } from 'firebase/auth';
import { seedDatabaseAction, createArticleAction, deleteArticleAction, updateArticleAction, createCategoryAction, updateCategoryAction, deleteCategoryAction, getCategorySettingsAction, updateCategorySettingsAction, updateUserRolesAction, deleteUserAction, deleteCommentAction } from '@/app/actions';
import { Article, Category, Comment, User, UserRole } from '@/lib/server-types';
import { NewArticleData, FullArticle, FullComment } from '@/lib/types';

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
    userRoles: UserRole[];
    isAdmin: boolean; // <-- ADDED: Explicitly define isAdmin status
    articles: FullArticle[];
    categories: Category[];
    comments: FullComment[];
    users: User[];
    isLoading: boolean;
    seedDatabase: () => Promise<void>;
    createArticle: (article: NewArticleData) => Promise<{ success: boolean; message: string; slug?: string; }>;
    updateArticle: (articleId: string, article: Partial<Article>) => Promise<{ success: boolean; message: string; slug?: string; }>;
    deleteArticle: (articleId: string) => Promise<{ success: boolean; message: string; }>;
    createCategory: (name: string, parentId: string | null, icon?: string) => Promise<{ success: boolean; message: string; id?: string }>;
    updateCategory: (categoryId: string, newName: string, newParentId: string | null) => Promise<{ success: boolean; message: string; }>;
    deleteCategory: (categoryId: string, newParentIdForChildren: string | null) => Promise<{ success: boolean; message: string; }>;
    getCategorySettings: () => Promise<{ success: boolean; settings?: CategorySettings; message?: string; }>;
    updateCategorySettings: (newSettings: Partial<CategorySettings>) => Promise<{ success: boolean; message: string; }>;
    updateUserRoles: (uid: string, roles: UserRole[]) => Promise<{ success: boolean; message: string; }>;
    deleteUser: (uid: string) => Promise<{ success: boolean; message: string; }>;
    deleteComment: (commentId: string) => Promise<{ success: boolean; message: string; }>;
    refreshData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { firestore, user, claims, isUserLoading: isAuthLoading } = useFirebase(); // Renamed to avoid conflict
    const userRoles = useMemo(() => (claims?.claims.roles || []) as UserRole[], [claims]);
    const isAdmin = useMemo(() => userRoles.includes('admin'), [userRoles]); // <-- ADDED: Calculate isAdmin based on roles
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

    const fullComments = useMemo(() => {
        const articleMap = new Map(articles.map(a => [a.id, a.title]));
        const userMap = new Map(users.map(u => [u.uid, u.name]));
        return comments.map(comment => ({
            ...comment,
            articleTitle: articleMap.get(comment.articleSlug) || 'Unknown Article',
            authorName: userMap.get(comment.userId) || 'Unknown Author',
        }));
    }, [comments, articles, users]);
    
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

    const deleteComment = async (commentId: string) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("You must be logged in to delete a comment.");
        }
        const token = await currentUser.getIdToken();
        return await deleteCommentAction(token, commentId);
    };
  
    const createCategory = async (name: string, parentId: string | null, icon?: string) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("You must be logged in to create a category.");
        }
        const token = await currentUser.getIdToken();
        return await createCategoryAction(token, name, parentId, icon);
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

    const updateUserRoles = async (uid: string, roles: UserRole[]) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("You must be logged in to update user roles.");
        }
        const token = await currentUser.getIdToken();
        return await updateUserRolesAction(token, uid, roles);
    };

    const deleteUser = async (uid: string) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("You must be logged in to delete a user.");
        }
        const token = await currentUser.getIdToken();
        return await deleteUserAction(token, uid);
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
        userRoles,
        isAdmin, // <-- ADDED: Provide isAdmin in the context
        articles: fullArticles,
        categories,
        comments: fullComments,
        users,
        isLoading: isAuthLoading || articlesLoading || categoriesLoading || userLoading || commentsLoading,
        seedDatabase,
        createArticle,
        updateArticle,
        deleteArticle,
        deleteComment,
        createCategory,
        updateCategory,
        deleteCategory,
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
