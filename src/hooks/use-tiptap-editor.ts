'use client';

import { useEditor } from '@tiptap/react';
import { useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { uploadContentImage } from '@/lib/image-upload';
import BubbleMenu from '@tiptap/extension-bubble-menu';

// Tiptap Extensions
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import Code from '@tiptap/extension-code';
import History from '@tiptap/extension-history';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import CharacterCount from '@tiptap/extension-character-count';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import HardBreak from '@tiptap/extension-hard-break';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import DragHandle from '@tiptap/extension-drag-handle';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';

// Custom Extensions and Components
import { CustomImage } from '@/components/tiptap-editor/extensions/custom-image-extension';
import { Youtube } from '@/components/tiptap-editor/extensions/youtube-extension';
import { CustomCodeBlock } from '@/components/tiptap-editor/extensions/custom-code-block-extension';
import SlashCommand from '@/components/tiptap-editor/extensions/slash-command';
import { Duplicate } from '@/components/tiptap-editor/extensions/duplicate-extension';
import { DeleteBlock } from '@/components/tiptap-editor/extensions/delete-extension';
import { CopyToClipboard } from '@/components/tiptap-editor/extensions/copy-extension';
import { HoverHighlight } from '@/components/tiptap-editor/extensions/hover-highlight-extension';
import { TableSelectionHighlighter } from '@/components/tiptap-editor/extensions/selection-highlight-extension';
import { MoveToLastCell } from '@/components/tiptap-editor/extensions/move-to-last-cell-extension';
import { CustomTableCell } from '@/components/tiptap-editor/extensions/custom-table-cell';

interface UseTiptapEditorProps {
  content: string;
  onChange: (richText: string) => void;
  articleId: string;
}

export const useTiptapEditor = ({ content, onChange, articleId }: UseTiptapEditorProps) => {
  const { user } = useFirebase();
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Underline,
      Strike,
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      ListItem,
      TaskList,
      TaskItem.configure({
        nested: true, // Allow for nested to-do lists
      }),
      Blockquote,
      Code,
      History,
      HardBreak,
      HorizontalRule,
      CustomImage,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      CustomTableCell,
      CustomCodeBlock,
      SlashCommand,
      BubbleMenu.configure(),
      CharacterCount.configure(),
      Youtube.configure({
        HTMLAttributes: {
          class: 'w-full aspect-video',
        },
      }),
      Dropcursor,
      Gapcursor,
      Placeholder.configure({
        placeholder: "Start writing, or type '/' to see commands...",
      }),
      Link.configure({
        openOnClick: false,
      }),
      DragHandle,
      Duplicate,
      DeleteBlock,
      CopyToClipboard,
      HoverHighlight,
      TableSelectionHighlighter,
      MoveToLastCell,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert w-full max-w-none prose-sm sm:prose-base lg:prose-lg focus:outline-none rounded-md p-2 min-h-[200px]',
        style: 'padding-left: 6rem;',
      },
      handleDrop: function (view, event, slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0 && user) {
          const files = Array.from(event.dataTransfer.files);
          const imageFiles = files.filter(file => file.type.startsWith('image/'));

          if (imageFiles.length > 0) {
            event.preventDefault();
            imageFiles.forEach(async (file) => {
              const { id, update } = toast({ title: 'Uploading image...', description: 'Your image is being uploaded.' });

              try {
                const downloadURL = await uploadContentImage(file, user.uid, articleId);
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
    if (!editor || editor.isDestroyed) {
      return;
    }

    if (editor.isEmpty || content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  return { editor };
};
