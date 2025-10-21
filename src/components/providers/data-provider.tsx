
"use client";

import React, { createContext, useContext, useMemo } from 'react';
import { collection, doc, DocumentData, QueryDocumentSnapshot, setDoc, SnapshotOptions } from "firebase/firestore";
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { useFirebase } from '@/firebase/provider';
import { getAuth } from 'firebase/auth';
import { seedDatabaseAction } from '@/app/actions';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Article, Category, Comment, User } from '@/lib/server-types';
import { NewArticleData } from '@/lib/types';

const converter = <T,>() => ({
    toFirestore: (data: T) => data as DocumentData,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions) => {
        const data = snapshot.data(options)!;
        return { ...data, id: snapshot.id } as T;
    }
});

interface DataContextType {
    user: User | null;
    articles: Article[];
    categories: Category[];
    comments: Comment[];
    isLoading: boolean;
    isAdmin: boolean;
    seedDatabase: () => Promise<void>;
    addArticle: (article: NewArticleData) => Promise<any>;
    addCategory: (category: Omit<Category, 'id'>) => Promise<any>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { firestore, user, claims } = useFirebase();
    const isAdmin = useMemo(() => !!claims?.claims.admin, [claims]);

    const articlesCollection = useMemo(() => firestore ? collection(firestore, 'articles').withConverter<Article>(converter<Article>()) : null, [firestore]);
    const [articlesSnapshot, articlesLoading] = useCollection(articlesCollection);
    const articles = useMemo(() => articlesSnapshot?.docs.map(doc => doc.data()) || [], [articlesSnapshot]);

    const categoriesCollection = useMemo(() => firestore ? collection(firestore, 'categories').withConverter<Category>(converter<Category>()) : null, [firestore]);
    const [categoriesSnapshot, categoriesLoading] = useCollection(categoriesCollection);
    const categories = useMemo(() => categoriesSnapshot?.docs.map(doc => doc.data()) || [], [categoriesSnapshot]);

    const userRef = useMemo(() => user ? doc(firestore!, 'users', user.uid).withConverter<User>(converter<User>()) : null, [firestore, user]);
    const [userSnapshot, userLoading] = useDocument(userRef);
    const userProfile = useMemo(() => userSnapshot?.data() || null, [userSnapshot]);

    const commentsCollection = useMemo(() => firestore ? collection(firestore, 'comments').withConverter<Comment>(converter<Comment>()) : null, [firestore]);
    const [commentsSnapshot, commentsLoading] = useCollection(commentsCollection);
    const comments = useMemo(() => commentsSnapshot?.docs.map(doc => doc.data()) || [], [commentsSnapshot]);
    
    const addArticle = (article: NewArticleData) => {
      if (!articlesCollection) {
          return Promise.reject("Firestore not initialized");
      }
      return addDocumentNonBlocking(articlesCollection, article as Article);
    };
  
    const addCategory = (category: Omit<Category, 'id'>) => {
      if (!firestore) {
          return Promise.reject("Firestore not initialized");
      }
      const categoryRef = doc(firestore, 'categories', category.slug);
      return setDoc(categoryRef, category);
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

    const value: DataContextType = {
        user: userProfile,
        articles,
        categories,
        comments,
        isLoading: articlesLoading || categoriesLoading || userLoading || commentsLoading,
        isAdmin,
        seedDatabase,
        addArticle,
        addCategory,
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
