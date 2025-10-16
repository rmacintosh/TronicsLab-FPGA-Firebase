import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  if (!image) {
    return {
      id: 'default',
      imageUrl: 'https://picsum.photos/seed/error/600/400',
      imageHint: 'abstract background',
    };
  }
  return image;
};

export const categories = {
  tutorials: {
    name: 'Tutorials',
    subCategories: [
      { name: 'FPGA Basics', slug: 'fpga-basics' },
      { name: 'Verilog', slug: 'verilog' },
      { name: 'VHDL', slug: 'vhdl' },
    ],
  },
  blog: {
    name: 'Blog',
    subCategories: [
      { name: 'Industry News', slug: 'industry-news' },
      { name: 'Project Showcases', slug: 'project-showcases' },
      { name: 'Advanced Topics', slug: 'advanced-topics' },
    ],
  },
};

export const articles = [
  {
    slug: 'getting-started-with-fpgas',
    title: 'Getting Started with FPGAs',
    description: 'An introductory guide to the world of Field-Programmable Gate Arrays.',
    category: 'tutorials',
    subCategory: 'fpga-basics',
    author: 'Admin',
    date: '2024-05-20',
    views: 12543,
    image: getImage('fpga-basics'),
    content: `
      <p>Field-Programmable Gate Arrays (FPGAs) are semiconductor devices that are based around a matrix of configurable logic blocks (CLBs) connected via programmable interconnects. FPGAs can be reprogrammed to desired application or functionality requirements after manufacturing. This feature distinguishes FPGAs from Application-Specific Integrated Circuits (ASICs), which are custom manufactured for specific design tasks. This guide will walk you through the basics.</p>
      <h3 class="font-headline text-2xl font-semibold mt-6 mb-4">What is an FPGA?</h3>
      <p>Unlike a microprocessor, an FPGA is not constrained by a fixed set of instructions. Instead, you can configure it to perform a specific task, or a set of tasks, in a massively parallel fashion. This makes them ideal for applications requiring high-speed data processing, such as digital signal processing, software-defined radio, and computer vision.</p>
      <h3 class="font-headline text-2xl font-semibold mt-6 mb-4">Your First "Hello World"</h3>
      <p>The "Hello World" of hardware is blinking an LED. It's a simple yet powerful way to confirm that your development environment is set up correctly and that you can successfully load a design onto your FPGA board. Here's a basic Verilog snippet to achieve this:</p>
    `
  },
  {
    slug: 'hello-world-in-verilog',
    title: 'Hello World in Verilog: Blinking an LED',
    description: 'Learn the "Hello World" of hardware design by blinking an LED with Verilog.',
    category: 'tutorials',
    subCategory: 'verilog',
    author: 'Admin',
    date: '2024-05-22',
    views: 8902,
    image: getImage('verilog-hello-world'),
    content: `
      <p>In hardware, the simplest way to verify your toolchain and board is to blink an LED. This tutorial will show you how to write a simple Verilog module to do just that.</p>
      <h3 class="font-headline text-2xl font-semibold mt-6 mb-4">The Verilog Code</h3>
      <p>We need a counter to slow down the blinking to a rate visible to the human eye. We'll toggle the LED state every time the counter reaches a certain value.</p>
    `
  },
  {
    slug: 'building-a-finite-state-machine',
    title: 'Building a Finite State Machine',
    description: 'A deep dive into designing and implementing finite state machines (FSMs) in Verilog.',
    category: 'tutorials',
    subCategory: 'verilog',
    author: 'Admin',
    date: '2024-06-01',
    views: 5671,
    image: getImage('advanced-fsm'),
    content: `
      <p>Finite State Machines are the cornerstone of digital logic design. They allow you to create sequential logic that responds to inputs and transitions through a series of states. This article explores the theory and practical implementation of FSMs.</p>
    `
  },
  {
    slug: 'the-rise-of-open-source-fpga-tools',
    title: 'The Rise of Open Source FPGA Tools',
    description: 'Exploring the growing ecosystem of open-source tools for FPGA development.',
    category: 'blog',
    subCategory: 'industry-news',
    author: 'Admin',
    date: '2024-06-10',
    views: 3210,
    image: getImage('optimizing-verilog'),
    content: `
      <p>For years, FPGA development was locked behind proprietary, expensive software suites. But a new wave of open-source projects like Yosys, nextpnr, and Icestorm is changing the game, making FPGA development more accessible than ever.</p>
    `
  },
  {
    slug: 'creating-a-risc-v-soft-processor',
    title: 'Project: Creating a RISC-V Soft Processor',
    description: 'A step-by-step showcase of building a simple RISC-V CPU core on an FPGA.',
    category: 'blog',
    subCategory: 'project-showcases',
    author: 'Admin',
    date: '2024-06-15',
    views: 9876,
    image: getImage('soc-design'),
    content: `
      <p>Ever wanted to build your own CPU? With an FPGA, you can! This post documents the process of designing, implementing, and testing a small RISC-V soft processor from scratch.</p>
    `
  },
];

export const featuredArticles = articles.slice(0, 3);

export const comments = [
    { articleSlug: 'getting-started-with-fpgas', userEmail: 'student@example.com', comment: 'This was super helpful, thanks!', date: '2024-05-21' },
    { articleSlug: 'getting-started-with-fpgas', userEmail: 'pro@example.com', comment: 'A good overview. I would add a section on timing constraints.', date: '2024-05-22' },
    { articleSlug: 'hello-world-in-verilog', userEmail: 'newbie@example.com', comment: 'I got my LED blinking! So satisfying.', date: '2024-05-23' },
];

export const user = {
    email: 'admin@troniclab.com',
    name: 'Admin User',
    avatar: 'https://picsum.photos/seed/user/100/100',
    isAdmin: true,
};
