
"use client";

import React, { createContext, useContext, useState, Dispatch, SetStateAction } from 'react';
import { initialArticles, initialCategories, initialComments, Article, Category, Comment } from '@/lib/data';

interface DataContextProps {
  articles: Article[];
  categories: Category;
  comments: Comment[];
  setArticles: Dispatch<SetStateAction<Article[]>>;
  setCategories: Dispatch<SetStateAction<Category>>;
  setComments: Dispatch<SetStateAction<Comment[]>>;
  addArticle: (article: Article) => void;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [categories, setCategories] = useState<Category>(initialCategories);
  const [comments, setComments] = useState<Comment[]>(initialComments);

  const addArticle = (article: Article) => {
    setArticles(prev => [...prev, article]);
  };

  return (
    <DataContext.Provider value={{ articles, categories, comments, addArticle, setArticles, setCategories, setComments }}>
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

    