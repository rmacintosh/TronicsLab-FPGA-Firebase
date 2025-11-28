
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CustomImage } from './custom-image';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import CodeBlock from '@tiptap/extension-code-block';
import { Toolbar } from './toolbar';
import { useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { uploadContentImage } from '@/lib/image-upload';

// 1. Extend the CodeBlock extension
const CustomCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      // inherit the default attributes
      ...this.parent?.(),
      // add a new attribute for language
      language: {
        default: null,
        // This is used to parse the language from the HTML
        parseHTML: element => {
          const codeEl = element.querySelector('code');
          if (!codeEl) {
            return null;
          }
          const language = codeEl.className.match(/language-([\w-]+)/)?.[1];
          return language || null;
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    // The outer element is a <pre> tag
    return [
      'pre',
      HTMLAttributes,
      [
        // The inner element is a <code> tag
        'code',
        {
          // Add the language class to the <code> tag
          class: node.attrs.language
            ? `language-${node.attrs.language}`
            : '',
        },
        // 0 means this is where the content should be rendered
        0,
      ],
    ];
  },
});

const TiptapEditor = ({
  content,
  onChange,
}: {
  content: string;
  onChange: (richText: string) => void;
}) => {
  const { user } = useFirebase();
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We're disabling the default to use our custom one
      }),
      CustomImage,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CustomCodeBlock, // Use the extended CodeBlock
    ],
    content: '', 
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert w-full max-w-none prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none border border-gray-300 rounded-md p-2 min-h-[200px]',
      },
      handleDrop: function(view, event, slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0 && user) {
          const files = Array.from(event.dataTransfer.files);
          const imageFiles = files.filter(file => file.type.startsWith('image/'));

          if (imageFiles.length > 0) {
            event.preventDefault();
            imageFiles.forEach(async (file) => {
              const { id, update } = toast({ title: 'Uploading image...', description: 'Your image is being uploaded.' });
              
              try {
                const downloadURL = await uploadContentImage(file);
                view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.image.create({ src: downloadURL })));
                update({ id, title: 'Image successfully added!' });
              } catch (error) {
                console.error('Error handling dropped image:', error);
                update({ id, variant: 'destructive', title: 'Image upload failed', description: 'There was an error processing your image.' });
              }
            });
            return true; 
          }
        }
        return false;
      },
    },
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;
