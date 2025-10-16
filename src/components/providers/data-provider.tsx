
"use client";

import React, { createContext, useContext, useState } from 'react';
import { initialArticles, initialCategories, initialComments, Article, Category, Comment } from '@/lib/data';

interface DataContextProps {
  articles: Article[];
  categories: Category;
  comments: Comment[];
  addArticle: (article: Article) => void;
  addCategory: (slug: string, name: string) => Category;
  addSubCategory: (categorySlug: string, subCategory: { name: string, slug: string }) => void;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [categories, setCategories] = useState<Category>(initialCategories);
  const [comments, setComments] = useState<Comment[]>(initialComments);

  const addArticle = (article: Article) => {
    setArticles(prev => [...prev, article]);
  };

  const addCategory = (slug: string, name: string) => {
    const newCategories = {
      ...categories,
      [slug]: { name, subCategories: [] },
    };
    setCategories(newCategories);
    return newCategories;
  };

  const addSubCategory = (categorySlug: string, subCategory: { name: string, slug: string }) => {
    setCategories(prev => {
      const newCategories = { ...prev };
      if (newCategories[categorySlug as keyof typeof newCategories]) {
        newCategories[categorySlug as keyof typeof newCategories].subCategories.push(subCategory);
      }
      return newCategories;
    });
  };

  return (
    <DataContext.Provider value={{ articles, categories, comments, addArticle, addCategory, addSubCategory }}>
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
