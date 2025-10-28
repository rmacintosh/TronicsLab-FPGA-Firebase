'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Toolbar } from './toolbar';

const TiptapEditor = ({
  content,
  onChange,
}: {
  content: string;
  onChange: (richText: string) => void;
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none border border-gray-300 rounded-md p-2 min-h-[200px]',
      },
    },
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;
