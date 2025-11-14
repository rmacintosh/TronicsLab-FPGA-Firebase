'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CustomImage } from './custom-image';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
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
import { uploadImageAndListen } from '@/lib/image-upload';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { collection, doc } from "firebase/firestore";

const TiptapEditor = ({
  content,
  onChange,
}: {
  content: string;
  onChange: (richText: string) => void;
}) => {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default to use custom below
      }),
      CustomImage, // Your custom image extension
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlock,
    ],
    content: '', 
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert w-full max-w-none prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none border border-gray-300 rounded-md p-2 min-h-[200px]',
      },
      handleDrop: function(view, event, slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0 && user && firestore) {
          const files = Array.from(event.dataTransfer.files);
          const imageFiles = files.filter(file => file.type.startsWith('image/'));

          if (imageFiles.length > 0) {
            event.preventDefault();
            imageFiles.forEach(async (file) => {
              // Generate a unique ID for the image on the client-side
              const imageId = doc(collection(firestore, 'images')).id;

              try {
                toast({ title: 'Uploading image...', description: 'Your image is being uploaded and processed.' });
                
                // Pass the unique ID to the upload function
                const { data } = await uploadImageAndListen(file, user.uid, imageId, () => {});
                
                const storage = getStorage();
                // Use medium size for in-content images, fallback to original
                const imageUrl = data.resizedPaths.medium || data.originalPath;
                const imageRef = ref(storage, imageUrl);
                const downloadURL = await getDownloadURL(imageRef);

                view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.image.create({ src: downloadURL })));
                toast({ title: 'Image successfully added!' });
              } catch (error) {
                console.error('Error handling dropped image:', error);
                toast({ variant: 'destructive', title: 'Image upload failed', description: 'There was an error processing your image.' });
              }
            });
            return true; // Indicating that we've handled the drop
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
