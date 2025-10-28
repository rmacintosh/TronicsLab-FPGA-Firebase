'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold,
  Strikethrough,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react';

export const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded-md p-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-gray-200 p-1 rounded-md' : 'p-1'}
      >
        <Bold className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-gray-200 p-1 rounded-md' : 'p-1'}
      >
        <Italic className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'bg-gray-200 p-1 rounded-md' : 'p-1'}
      >
        <Strikethrough className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 p-1 rounded-md' : 'p-1'}
      >
        <Heading1 className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 p-1 rounded-md' : 'p-1'}
      >
        <Heading2 className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 p-1 rounded-md' : 'p-1'}
      >
        <Heading3 className="w-5 h-5" />
      </button>
    </div>
  );
};
