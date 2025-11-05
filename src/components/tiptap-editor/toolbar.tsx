'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Code,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
} from 'lucide-react';
import { useFirebase, useStorage } from '@/firebase/provider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useCallback } from 'react';

export const Toolbar = ({ editor }: { editor: Editor | null }) => {
  const { user } = useFirebase();
  const storage = useStorage();
  const { toast } = useToast();

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    toast({ title: "Uploading Image...", description: "Please wait while the image is uploaded." });

    try {
      const storageRef = ref(storage, `images/${user.uid}/content/${Date.now()}-${file.name}`);
      const uploadTask = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadTask.ref);

      editor.chain().focus().setImage({ src: downloadURL }).run();
      toast({ title: "Image Inserted!", description: "The image has been successfully added to your article." });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload the image." });
    }
  };

  return (
    <div className="sticky top-20 z-10 bg-background border border-gray-300 rounded-md p-2 flex items-center gap-1 flex-wrap">
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-gray-200' : ''}><Bold className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-gray-200' : ''}><Italic className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'bg-gray-200' : ''}><Underline className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}><Heading1 className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}><Heading2 className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}><Heading3 className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}><List className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}><ListOrdered className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={editor.isActive('codeBlock') ? 'bg-gray-200' : ''}><Code className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={setLink} className={editor.isActive('link') ? 'bg-gray-200' : ''}><LinkIcon className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}><AlignLeft className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}><AlignCenter className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}><AlignRight className="w-5 h-5" /></Button>
      <Button type="button" variant="ghost" size="sm" asChild>
        <label className="cursor-pointer m-0 p-2 h-9 w-9 inline-flex items-center justify-center">
          <ImageIcon className="w-5 h-5" />
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm"><TableIcon className="w-5 h-5" /></Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Insert Table</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().addColumnBefore().run()}>Add Column Before</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().addColumnAfter().run()}>Add Column After</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().deleteColumn().run()}>Delete Column</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().addRowBefore().run()}>Add Row Before</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().addRowAfter().run()}>Add Row After</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().deleteRow().run()}>Delete Row</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().deleteTable().run()}>Delete Table</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().mergeCells().run()}>Merge Cells</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().splitCell().run()}>Split Cell</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeaderColumn().run()}>Toggle Header Column</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Toggle Header Row</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeaderCell().run()}>Toggle Header Cell</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
