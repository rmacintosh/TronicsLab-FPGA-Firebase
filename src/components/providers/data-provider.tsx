"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { useCollection, useFirebase, addDocumentNonBlocking, WithId, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import type { Article, Category, SubCategory, Comment } from '@/lib/types';

interface DataContextProps {
  articles: WithId<Article>[];
  categories: WithId<Category>[];
  subCategories: WithId<SubCategory>[];
  comments: WithId<Comment>[];
  addArticle: (article: Omit<Article, 'id'>) => Promise<any>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<any>;
  addSubCategory: (subCategory: Omit<SubCategory, 'id'>) => Promise<any>;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { firestore } = useFirebase();

  const articlesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'articles') : null, [firestore]);
  const { data: articles, isLoading: articlesLoading } = useCollection<Article>(articlesCollection);

  const categoriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'categories') : null, [firestore]);
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesCollection);

  const subCategoriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subCategories') : null, [firestore]);
  const { data: subCategories, isLoading: subCategoriesLoading } = useCollection<SubCategory>(subCategoriesCollection);

  const commentsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'comments') : null, [firestore]);
  const { data: comments, isLoading: commentsLoading } = useCollection<Comment>(commentsCollection);
  
  const addArticle = (article: Omit<Article, 'id'>) => {
    if (!articlesCollection) {
        return Promise.reject("Firestore not initialized");
    }
    return addDocumentNonBlocking(articlesCollection, article);
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    if (!firestore) {
        return Promise.reject("Firestore not initialized");
    }
    const categoryRef = doc(firestore, 'categories', category.slug);
    return setDoc(categoryRef, category);
  };

  const addSubCategory = (subCategory: Omit<SubCategory, 'id'>) => {
    if (!firestore) {
        return Promise.reject("Firestore not initialized");
    }
    const subCategoryRef = doc(firestore, 'subCategories', `${subCategory.parentCategory}-${subCategory.slug}`);
    return setDoc(subCategoryRef, subCategory);
  };

  const isLoading = articlesLoading || categoriesLoading || subCategoriesLoading || commentsLoading;

  const value = {
    articles: articles || [],
    categories: categories || [],
    subCategories: subCategories || [],
    comments: comments || [],
    addArticle,
    addCategory,
addSubCategory,
    isLoading,
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
