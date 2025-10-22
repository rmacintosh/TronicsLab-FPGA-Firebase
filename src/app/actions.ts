'use server';

import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import { adminFirestore } from '@/firebase/admin';
import { Article, Category } from '../lib/server-types';
import { NewArticleData } from '../lib/types';
import { JSDOM } from 'jsdom';
import { bundledLanguages, createHighlighter, Highlighter } from 'shiki';

// Create a single highlighter instance promise that can be reused.
const highlighterPromise: Promise<Highlighter> = createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: Object.keys(bundledLanguages),
});

/**
 * A server action to get syntax-highlighted HTML.
 */
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

/**
 * A server action to seed the Firestore database with a new hierarchical structure.
 */
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

    if (!decodedToken.admin) {
       return {
         success: false,
         message: 'Authorization required. You must be an admin to perform this action.',
       };
    }

    const firestoreAdmin = adminFirestore;
    const batch = firestoreAdmin.batch();

    // Clear existing articles and categories to ensure a fresh seed
    const existingArticles = await firestoreAdmin.collection('articles').get();
    existingArticles.forEach(doc => batch.delete(doc.ref));
    const existingCategories = await firestoreAdmin.collection('categories').get();
    existingCategories.forEach(doc => batch.delete(doc.ref));

    // 1. Define Categories with Hierarchy
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

    // 2. Define Articles and link them using categoryId
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const initialArticles: Omit<Article, 'id'>[] = [
      {
        slug: 'fpga-basics-a-beginners-guide',
        title: "FPGA Basics: A Beginner's Guide",
        description: "Learn the fundamentals of FPGAs, their architecture, and how they differ from traditional processors.",
        categoryId: cat_fpgaDev.id, // Linked to top-level category
        author: 'Admin',
        date: '2024-01-15T10:00:00.000Z',
        views: 1250,
        image: { id: 'fpga-basics', imageUrl: '/placeholder-images/fpga-basics.png', imageHint: 'A close-up of a complex FPGA chip with glowing circuits.' },
        content: '<p>Field-Programmable Gate Arrays (FPGAs) are a fascinating type of integrated circuit that can be configured by a designer after manufacturing...</p>',
      },
      {
        slug: 'your-first-verilog-project-hello-world',
        title: "Your First Verilog Project: Hello, World!",
        description: "A step-by-step tutorial to create your first Verilog project, the classic \"Hello, World!\" of hardware.",
        categoryId: subcat_verilog.id, // Linked to sub-category
        author: 'Admin',
        date: '2024-02-02T14:30:00.000Z',
        views: 980,
        image: { id: 'verilog-hello-world', imageUrl: '/placeholder-images/verilog-hello-world.png', imageHint: 'A computer screen showing simple Verilog code.' },
        content: '<p>Let\'s get started with your first Verilog project. We\'ll create a simple module that outputs a constant value...</p>',
      },
      {
        slug: 'advanced-fsm-design-for-complex-protocols',
        title: "Advanced FSM Design for Complex Protocols",
        description: "Dive deep into finite state machine design for implementing complex communication protocols on an FPGA.",
        categoryId: subcat2_fsm.id, // Linked to sub-category 2
        author: 'Admin',
        date: '2024-03-10T09:00:00.000Z',
        views: 2100,
        image: { id: 'advanced-fsm', imageUrl: '/placeholder-images/advanced-fsm.png', imageHint: 'An abstract diagram of a complex finite state machine.' },
        content: '<p>Finite State Machines (FSMs) are a cornerstone of digital design. In this article, we\'ll explore how to use them to implement a simple UART transmitter.</p>',
      },
    ];

    // 3. Batch write to Firestore
    initialCategories.forEach(category => {
      const categoryRef = firestoreAdmin.collection('categories').doc(category.id);
      batch.set(categoryRef, category);
    });

    initialArticles.forEach(article => {
      // Use slug as the document ID for articles as before
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

    if (!decodedToken.admin) {
      return { success: false, message: 'Authorization required. Must be an admin.' };
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
      author: decodedToken.name || decodedToken.email || 'Admin',
      date: new Date().toISOString(),
      views: 0,
      image: articleData.image,
      content: articleData.content,
    };

    await articleRef.set(finalArticleData);

    return { success: true, message: 'Article created successfully!', slug: articleData.slug };
  } catch (error: any) {
    console.error('Error in createArticleAction:', error);
    return { success: false, message: `Failed to create article: ${error.message}` };
  }
}
