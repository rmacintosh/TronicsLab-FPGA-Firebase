"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useCollection, useFirebase, addDocumentNonBlocking, WithId, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import type { Article, Category, SubCategory, Comment } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface DataContextProps {
  articles: WithId<Article>[];
  categories: WithId<Category>[];
  subCategories: WithId<SubCategory>[];
  comments: WithId<Comment>[];
  addArticle: (article: Omit<Article, 'id'>) => Promise<any>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<any>;
  addSubCategory: (subCategory: Omit<SubCategory, 'id'>) => Promise<any>;
  seedDatabase: () => Promise<void>;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

const initialCategories: Omit<Category, 'id'>[] = [
    { name: 'Tutorials', slug: 'tutorials' },
    { name: 'Blog', slug: 'blog' },
];

const initialSubCategories: Omit<SubCategory, 'id'>[] = [
    { name: 'Getting Started', slug: 'getting-started', parentCategory: 'tutorials' },
    { name: 'Advanced', slug: 'advanced', parentCategory: 'tutorials' },
    { name: 'News', slug: 'news', parentCategory: 'blog' },
    { name: 'Project Spotlights', slug: 'project-spotlights', parentCategory: 'blog' },
];

const initialArticles: Omit<Article, 'id'>[] = [
  {
    slug: 'fpga-basics-a-beginners-guide',
    title: "FPGA Basics: A Beginner's Guide",
    description: "Learn the fundamentals of FPGAs, from what they are to how they work. This guide covers the essential concepts to get you started on your first project.",
    category: 'tutorials',
    subCategory: 'Getting Started',
    author: 'Admin',
    date: '2024-01-15T10:00:00.000Z',
    views: 1250,
    image: PlaceHolderImages.find(img => img.id === 'fpga-basics')!,
    content: `<p>This is a detailed article about the basics of FPGAs...</p>`,
  },
  {
    slug: 'your-first-verilog-project-hello-world',
    title: "Your First Verilog Project: Hello, World!",
    description: "A step-by-step tutorial on creating a simple 'Hello, World!' project in Verilog. Perfect for those new to hardware description languages.",
    category: 'tutorials',
    subCategory: 'Getting Started',
    author: 'Admin',
    date: '2024-02-02T14:30:00.000Z',
    views: 980,
    image: PlaceHolderImages.find(img => img.id === 'verilog-hello-world')!,
    content: `<p>This is a detailed article about creating a 'Hello, World!' project in Verilog...</p>`,
  },
  {
    slug: 'building-an-led-blinker-with-an-fpga',
    title: "Building an LED Blinker with an FPGA",
    description: "Follow along as we create a classic LED blinker project. This hands-on tutorial will solidify your understanding of basic FPGA development.",
    category: 'tutorials',
    subCategory: 'Getting Started',
    author: 'Admin',
    date: '2024-02-20T11:00:00.000Z',
    views: 1800,
    image: PlaceHolderImages.find(img => img.id === 'led-blinker-project')!,
    content: `<p>This is a detailed article about building an LED blinker...</p>`,
  },
  {
    slug: 'advanced-fsm-design-for-complex-protocols',
    title: "Advanced FSM Design for Complex Protocols",
    description: "Dive deep into finite state machine design. This article explores techniques for handling complex communication protocols and improving FSM robustness.",
    category: 'tutorials',
    subCategory: 'Advanced',
    author: 'Admin',
    date: '2024-03-10T09:00:00.000Z',
    views: 2100,
    image: PlaceHolderImages.find(img => img.id === 'advanced-fsm')!,
    content: `<p>This is a detailed article about advanced FSM design...</p>`,
  },
  {
    slug: 'optimizing-your-verilog-for-better-performance',
    title: "Optimizing Your Verilog for Better Performance",
    description: "Learn tips and tricks for writing more efficient Verilog code. This article covers synthesis-friendly coding styles and performance optimization strategies.",
    category: 'blog',
    subCategory: 'News',
    author: 'Admin',
    date: '2024-04-05T16:00:00.000Z',
    views: 3200,
    image: PlaceHolderImages.find(img => img.id === 'optimizing-verilog')!,
    content: `<p>This is a detailed article about optimizing Verilog...</p>`,
  },
  {
    slug: 'the-rise-of-soc-fpgas-a-new-era-of-computing',
    title: "The Rise of SoC FPGAs: A New Era of Computing",
    description: "System-on-Chip (SoC) FPGAs are changing the game. Discover what they are, their advantages, and how they are powering the next generation of embedded systems.",
    category: 'blog',
    subCategory: 'Project Spotlights',
    author: 'Admin',
    date: '2024-05-01T18:00:00.000Z',
    views: 4500,
    image: PlaceHolderImages.find(img => img.id === 'soc-design')!,
    content: `<p>This is a detailed article about SoC FPGAs...</p>`,
  },
];


export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { firestore } = useFirebase();

  const articlesCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'articles') : null), [firestore]);
  const { data: articles, isLoading: articlesLoading } = useCollection<Article>(articlesCollection);

  const categoriesCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'categories') : null), [firestore]);
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesCollection);

  const subCategoriesCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'subCategories') : null), [firestore]);
  const { data: subCategories, isLoading: subCategoriesLoading } = useCollection<SubCategory>(subCategoriesCollection);

  const commentsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'comments') : null), [firestore]);
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

  const seedDatabase = async () => {
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }
    const articlesQuery = query(collection(firestore, 'articles'), limit(1));
    const articlesSnapshot = await getDocs(articlesQuery);

    if (!articlesSnapshot.empty) {
        throw new Error("Database has already been seeded.");
    }
    
    const batch = writeBatch(firestore);

    initialCategories.forEach(category => {
        const categoryRef = doc(firestore, 'categories', category.slug);
        batch.set(categoryRef, category);
    });

    initialSubCategories.forEach(subCategory => {
        const subCategoryRef = doc(firestore, 'subCategories', `${subCategory.parentCategory}-${subCategory.slug}`);
        batch.set(subCategoryRef, subCategory);
    });

    initialArticles.forEach(article => {
        const articleRef = doc(firestore, 'articles', article.slug);
        batch.set(articleRef, article);
    });

    await batch.commit();
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
    seedDatabase,
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
