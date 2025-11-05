
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
      icon: 'Cpu',
      parentId: null,
      description: 'Learn the fundamentals and advanced topics in FPGA design and development.',
    };

    const subcat_verilog: Category = {
      id: 'verilog-hdl',
      name: 'Verilog HDL',
      slug: 'verilog-hdl',
      icon: 'BookOpen',
      parentId: cat_fpgaDev.id,
      description: 'Master the Verilog Hardware Description Language for digital design.',
    };

    const subcat_vhdl: Category = {
      id: 'vhdl',
      name: 'VHDL',
      slug: 'vhdl',
      icon: 'Binary',
      parentId: cat_fpgaDev.id,
      description: 'Explore the VHDL language for creating robust hardware systems.',
    };
    
    const subcat2_fsm: Category = {
      id: 'fsm-design',
      name: 'FSM Design',
      slug: 'fsm-design',
      icon: 'CircuitBoard',
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
        categoryId: subcat2_fsm.id,
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
        categoryId: subcat2_fsm.id,
        authorId: decodedToken.uid,
        date: '2024-02-02T14:30:00.000Z',
        views: 980,
        image: { id: 'verilog-hello-world', imageUrl: '/placeholder-images/verilog-hello-world.png', imageHint: 'A computer screen showing simple Verilog code.' },
        content: '<p>Let\\\'s get started with your first Verilog project. We\\\'ll create a simple module that outputs a constant value...</p>',
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
        content: '<p>Finite State Machines (FSMs) are a cornerstone of digital design. In this article, we\\\'ll explore how to use them to implement a simple UART transmitter.</p>',
      },
      {
        slug: 'how-to-install-icestorm-with-docker',
        title: 'How to install Icestorm with Docker',
        description: 'How to install Icestorm with Docker',
        categoryId: subcat_vhdl.id,
        authorId: decodedToken.uid,
        date: '2025-10-30T06:02:14.555Z',
        views: 0,
        image: { id: 'img-1761804134439', imageUrl: '/images/image.jpg', imageHint: 'placeholder ' },
        content: '<h1>How to install Icestorm with Docker</h1><p>Today’s post is a short one, part of a larger series...</p><h2>Icestorm Dockerfile</h2><pre><code class="language-dockerfile">FROM ubuntu:20.04\nARG DEBIAN_FRONTEND=noninteractive\nENV TZ=Europe/Paris\nRUN apt-get update; apt-get -y install curl git\nRUN apt-get install -y build-essential clang bison flex gperf libfl2 \\ libfl-dev libreadline-dev gawk tcl-dev libffi-dev \\ graphviz xdot pkg-config python python3 libftdi-dev \\ qt5-default python3-dev libboost-all-dev cmake libeigen3-dev\nRUN git clone https://github.com/YosysHQ/icestorm.git icestorm\nRUN cd icestorm; make -j$(nproc); make install</code></pre><p>Build the image:</p><pre><code class="language-undefined">docker build -t icestorm .</code></pre><p></p>',
      },
      {
        slug: 'how-to-install-nextpnr-with-docker',
        title: 'How to install NextPnR with Docker',
        description: 'How to install NextPnR with Docker',
        categoryId: subcat_vhdl.id,
        authorId: decodedToken.uid,
        date: '2025-10-30T06:03:12.700Z',
        views: 0,
        image: { id: 'img-1761804192586', imageUrl: '/images/image.jpg', imageHint: 'placeholder ' },
        content: '<h1>How to install NextPnR with Docker</h1><p>Today’s post is part of a larger series that shows how to install Yosys and Icestorm with Docker...</p><h2>NextPnR Dockerfile</h2><pre><code class="language-dockerfile">FROM icestorm:latest\nRUN git clone https://github.com/YosysHQ/nextpnr nextpnr\nRUN cd nextpnr; \\n git submodule init && git submodule update; \\n cmake . -DARCH=ice40 -DCMAKE_INSTALL_PREFIX=/usr/local; \\n make -j$(nproc); \\n make install</code></pre><p>Build the image:</p><pre><code class="language-undefined">docker build -t nextpnr .</code></pre><p></p>',
      },
      {
        slug: 'how-to-install-yosys-with-docker',
        title: 'How to install Yosys with Docker',
        description: 'How to install Yosys with Docker',
        categoryId: subcat_vhdl.id,
        authorId: decodedToken.uid,
        date: '2025-10-30T06:04:29.274Z',
        views: 0,
        image: { id: 'img-1761804269116', imageUrl: '/images/image.jpg', imageHint: 'placeholder ' },
        content: '<h1>How to install Yosys with Docker</h1><p>To get started with learning FPGA easily, it’s best to begin with Free and Open Source Software (FOSS). The first tool you’ll need is a Synthesizer...</p><h2>I. What is Docker? What are the benefits?</h2><p>Docker is an open-source platform for automating deployment, scaling, and management of applications as containers...</p><h2>II. Installing Yosys in Docker</h2><p>Follow the instructions here to install Docker first.</p><h3>a. The Dockerfile</h3><pre><code class="language-dockerfile">FROM ubuntu:20.04\nARG DEBIAN_FRONTEND=noninteractive\nENV TZ=Europe/Paris\nRUN apt-get update; apt-get -y install curl\nRUN apt-get install -y build-essential git clang bison flex \\ libreadline-dev gawk tcl-dev libffi-dev git \\ graphviz xdot pkg-config python3 libboost-system-dev \\ libboost-python-dev libboost-filesystem-dev zlib1g-dev\nRUN git clone https://github.com/YosysHQ/yosys.git yosys\nRUN cd yosys; make -j$(nproc); make install\nWORKDIR "/project/"\nENTRYPOINT [ "/bin/bash", "-c", "yosys src/synth/synth.ys > build/logs/syn_log.txt" ]</code></pre><h3>b. Building the image</h3><pre><code class="language-undefined">docker build -t yosys .</code></pre><h2>III. Project Workspace</h2><pre><code class="language-makefile">Makefile src: synth: - synth.ys hdl: - top.v build: logs: artifacts: syn:</code></pre><pre><code class="language-verilog">// top.v\nmodule top( input clock, input resetn, output reg LED );\n reg tmp = 1\'b0;\n always @(posedge clock) begin\n if(!resetn) tmp <= 1\'b0;\n else tmp <= ~tmp;\n LED <= tmp;\n end\nendmodule</code></pre><p>Use the Makefile or Docker run commands as described...</p>',
      },
      {
        slug: 'from-hdl-to-fpga-bitstream-with-open-source-toolchain',
        title: 'From HDL to FPGA Bitstream with Open Source Toolchain',
        description: 'In almost every software domain, you can start for free with open-source tools at home. It is finally the case of FPGA, and it is time to democratize it.',
        categoryId: subcat_vhdl.id,
        authorId: decodedToken.uid,
        date: '2025-10-30T06:00:29.299Z',
        views: 0,
        image: { id: 'img-1761804022123', imageUrl: '/images/image.jpg', imageHint: 'placeholder image for now' },
        content: '<h1>From HDL to FPGA Bitstream with Open Source Toolchain</h1><p>Starting to learn FPGA can be challenging, and one of the biggest obstacles is the toolchain. For instance, a beginner may end up subscribing to a vendor’s website, surrendering his personal information, downloading a massive ~100GB software package, and spending half a day installing it, only to discover that he needs a license to use the IP he wanted for his project. This can be frustrating, not to mention the lack of innovation in the FPGA job, which makes our job more laborious, particularly for software engineers accustomed to more comfortable workflows.</p><p>It is ironic that licensed tools offer extensive capabilities but have two major drawbacks: they are too expensive to train people, and no one can learn at home. So we end up with a labor market without enough FPGA engineers. In contrast, in almost every software domain, you can start for free with open-source tools at home. It is finally the case of FPGA, and it is time to democratize it.</p><h2>Go-to toolchain for beginner</h2><p>That’s why today’s tutorial is a step-by-step guide on how to go from an HDL file to a bitstream for an ICE40 FPGA using open source tool-chain: Yosys for synthesis, Nextpnr for place and route, and Icestorm for bitstream generation and flashing.</p><p>The tutorial uses the Alchitry CU board, which integrates an ICE40 FPGA. If you’d like to follow along, you’ll need an ICE40 FPGA board like the Alchitry CU, Icebreaker, or Go Board.</p><p>🎓 Enroll in “Basic Digital Design for FPGA” Course 🚀</p><p>Or</p><p>Try it for free 🤓</p><h2>I. The tool-chain</h2><p>In my last three blog articles, we discussed how to use Docker to install Yosys, Nextpnr, and Icestorm. To move forward, it is necessary to have all three software up and running within a container. To do this tutorial, you will need to complete the following steps:</p><ul><li><p>Install Make.</p></li><li><p>Get Docker.</p></li><li><p>Follow the instructions in the article “How to install Yosys with Docker?” to obtain a functional Yosys image.</p></li><li><p>Follow the instructions in the article “How to install Icestorm with Docker?” to obtain a functional Icestorm image.</p></li><li><p>Follow the instructions in the article “How to install NextPnR with Docker?” to obtain a functional Nextpnr image.</p></li></ul><p>You will find a dockerfile for each one. Assuming you have successfully completed the installation process for all three software, you should have the following docker images: <code>yosys:latest</code>, <code>nextpnr:latest</code>, and <code>icestorm:latest</code>. You can confirm this by typing the command:</p><pre><code class="language-undefined">docker images</code></pre><p>The project is available on my <a target="_blank" rel="noopener noreferrer nofollow" href="#">GitHub</a>.</p><h2>Project Tree</h2><pre><code class="language-makefile">Makefile src: hdl: - top.v synth: - synth.ys pnr: - pnr.sh bitgen: - bitgen.sh load: - load.sh constraints: - alchitry.pcf build: artifacts: syn: pnr: bitstream: logs:</code></pre><p>If you want to do everything from scratch create a makefile and start with this. If you clone the repo just do the make command that follows.</p><pre><code class="language-makefile">clean: rm -rf build/\nbuild_tree: mkdir build\nmkdir build/artifacts\nmkdir build/artifacts/syn/\nmkdir build/artifacts/pnr/\nmkdir build/artifacts/bitstream/\nmkdir build/logs/</code></pre><p>And run:</p><pre><code class="language-undefined">make build_tree</code></pre><h2>Top module example</h2><p>The top is an LED connected to a DFF with constant 1 as d input. It is turned off when pushing the reset button. It can be any working design as long as it is written in Verilog and called <code>top.v</code>.</p><pre><code class="language-verilog">module top( input clock, input resetn, output reg LED );\n always @(posedge clock) begin\n if(!resetn) LED <= 1\'b0;\n else LED <= 1\'b1;\n end\nendmodule</code></pre><h2>II. The synthesis with Yosys</h2><p>...</p><p></p><p>This tutorial is quite extensive and may introduce several new concepts for beginners. If you feel lost or need assistance, please do not hesitate to comment. I will do my best to assist you.</p>',
      }
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

    // --- START DEBUG LOGGING ---
    console.log('--- Received articleData from client ---');
    console.log(JSON.stringify(articleData, null, 2));
    // --- END DEBUG LOGGING ---

    const firestoreAdmin = adminFirestore;
    const articleRef = firestoreAdmin.collection('articles').doc(articleId);

    const sanitizedPayload: { [key: string]: any } = {};
    
    (Object.keys(articleData) as Array<keyof typeof articleData>).forEach(key => {
      if (articleData[key] !== undefined) {
        sanitizedPayload[key] = articleData[key];
      }
    });

    if (sanitizedPayload.image && typeof sanitizedPayload.image === 'object') {
      const sanitizedImage: { [key: string]: any } = {};
      const image = sanitizedPayload.image as any;

      if (image.id !== undefined) sanitizedImage.id = image.id;
      if (image.imageUrl !== undefined) sanitizedImage.imageUrl = image.imageUrl;
      if (image.imageHint !== undefined) {
        sanitizedImage.imageHint = image.imageHint;
      }

      sanitizedPayload.image = sanitizedImage;
    }

    // --- START DEBUG LOGGING ---
    console.log('--- Sending sanitizedPayload to Firestore ---');
    console.log(JSON.stringify(sanitizedPayload, null, 2));
    // --- END DEBUG LOGGING ---

    if (Object.keys(sanitizedPayload).length === 0) {
      return { success: true, message: 'No changes to update.' };
    }

    await articleRef.update(sanitizedPayload);

    revalidatePath("/admin/articles");
    if (articleData.slug) {
      revalidatePath(`/articles/${articleData.slug}`);
    }

    return { success: true, message: 'Article updated successfully!', slug: articleData.slug };
  } catch (error: any) {
    console.error('--- Error in updateArticleAction ---');
    console.error(error); // Log the raw error object
    console.error('--- Full Error (JSON) ---');
    console.error(JSON.stringify(error, null, 2)); // Log the stringified error
    const errorMessage = error.message || 'An unexpected response was received from the server';
    return { success: false, message: `Error updating article: ${errorMessage}` };
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

export async function createCategoryAction(authToken: string, name: string, parentId: string | null, icon?: string) {
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

    const docRef = await adminFirestore.collection('categories').add({ name, parentId, icon });
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

export async function updateCategoryAction(authToken: string, categoryId: string, newName: string, newParentId: string | null, newIcon?: string) {
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
            const updateData: { [key: string]: any } = { name: newName, parentId: newParentId };
            if (newIcon) {
                updateData.icon = newIcon;
            }
            transaction.update(categoryRef, updateData);
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

export async function createUserDocumentAction(authToken: string, name: string): Promise<{ success: boolean; message: string }> {
    if (!authToken) {
        return { success: false, message: 'Authentication required. No auth token provided.' };
    }

    try {
        const adminAuth = getAuth(getApps()[0]);
        const decodedToken = await adminAuth.verifyIdToken(authToken);
        const userEmail = decodedToken.email;
        
        if (!userEmail) {
            return { success: false, message: 'User email not found in auth token.' };
        }

        const userRef = adminFirestore.collection('users').doc(decodedToken.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            return { success: false, message: 'User document already exists.' };
        }

        const newUser: Omit<User, 'id'> = {
            uid: decodedToken.uid,
            name: name,
            email: userEmail,
            avatar: '/default-avatar.png', 
            roles: ['user'],
        };

        await userRef.set(newUser);

        return { success: true, message: 'User document created successfully.' };

    } catch (error: any) {
        console.error('Error in createUserDocumentAction:', error);
        return { success: false, message: `Failed to create user document: ${error.message}` };
    }
}
