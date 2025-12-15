'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { CustomImage } from './custom-image';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { uploadContentImage } from '@/lib/image-upload';
import { suggestion } from './slash-command';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { Youtube } from './youtube';
import { DragHandle as DragHandleReact } from '@tiptap/extension-drag-handle-react';
import DragHandle from '@tiptap/extension-drag-handle';
import Placeholder from '@tiptap/extension-placeholder';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { offset, shift } from '@floating-ui/dom';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Duplicate } from './duplicate-extension';
import { DeleteBlock } from './delete-extension';
import { CopyToClipboard } from './copy-extension';

// Import individual extensions
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

import Blockquote from '@tiptap/extension-blockquote';
import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import Code from '@tiptap/extension-code';
import Document from '@tiptap/extension-document';
import Heading from '@tiptap/extension-heading';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import Paragraph from '@tiptap/extension-paragraph';
import Strike from '@tiptap/extension-strike';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import CharacterCount from '@tiptap/extension-character-count';
import CodeBlock from '@tiptap/extension-code-block';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';

import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough,
  Heading1, 
  Heading2, 
  Heading3,
  Quote,
  Link as LinkIcon,
  GripVertical,
  Plus,
  Trash,
  Copy,
  Clipboard
} from 'lucide-react';

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

const SlashCommand = Extension.create({
    name: 'slashCommand',
  
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...suggestion,
        }),
      ]
    },
  })

const TiptapEditor = ({
  content,
  onChange,
  articleId,
}: {
  content: string;
  onChange: (richText: string) => void;
  articleId: string;
}) => {
  const { user } = useFirebase();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredPos, setHoveredPos] = useState<number | null>(null);
  const prevHoveredPosRef = useRef<number | null>(null);
  const pointerDownRef = useRef<{ x: number, y: number } | null>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

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
      Blockquote,
      Code,
      History,
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
      SlashCommand,
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
    ],
    content: '', 
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert w-full max-w-none prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none border border-gray-300 rounded-md p-2 pl-20 min-h-[200px]',
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
                // Pass the user ID and article ID to the upload function
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
    if (editor && content && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (menuOpen) {
      editor.commands.lockDragHandle();
    } else {
      editor.commands.unlockDragHandle();
    }
  }, [menuOpen, editor]);

  useEffect(() => {
    if (!editor) return;

    // Remove class from the previously hovered node
    if (prevHoveredPosRef.current !== null) {
      try {
        const oldDomNode = editor.view.nodeDOM(prevHoveredPosRef.current) as HTMLElement;
        if (oldDomNode) {
          oldDomNode.classList.remove('hovered-node');
        }
      } catch (e) {
        // It's possible the node was deleted, so nodeDOM might throw. Ignore.
      }
    }

    // Add class to the currently hovered node
    if (hoveredPos !== null) {
      try {
        const newDomNode = editor.view.nodeDOM(hoveredPos) as HTMLElement;
        if (newDomNode) {
          newDomNode.classList.add('hovered-node');
        }
      } catch (e) {
        // Node might not be rendered yet. Ignore.
      }
    }

    // Update the ref for the next run
    prevHoveredPosRef.current = hoveredPos;

  }, [hoveredPos, editor]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    window.removeEventListener('pointerup', handlePointerUp);
    if (pointerDownRef.current) {
      const dist = Math.sqrt(
        Math.pow(e.clientX - pointerDownRef.current.x, 2) +
        Math.pow(e.clientY - pointerDownRef.current.y, 2)
      );

      if (dist < 10) { // It's a click, not a drag
        setMenuOpen(true);
      }
    }
    pointerDownRef.current = null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }, [handlePointerUp]);

  const handleCopy = () => {
    if (!editor) return;
    editor.commands.copyNodeToClipboard();
  };

  const handleDelete = () => {
    if (!editor) return;
    editor.commands.deleteBlock();
  };

  const handleDuplicate = () => {
    if (!editor) return;
    editor.commands.duplicateNode();
  };

  return (
    <div className="relative w-full">
      {editor && (
        <>
          <DragHandleReact 
            pluginKey="dragHandle"
            editor={editor} 
            className="handle-wrapper"
            onNodeChange={({ pos }) => setHoveredPos(pos)}
            computePositionConfig={{
                placement: 'left-start',
                middleware: [
                  offset({ mainAxis: 12, crossAxis: 4 }), // Adjust position relative to the line
                  shift({ padding: 10 }), // Ensure it stays within view
                ],
              }}
          >
            <div contentEditable={false} className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="add-button"
                      onClick={() => {
                        const endPos = editor.state.selection.$from.end();
                        editor.chain().focus().insertContentAt(endPos, '<p></p>').run();
                      }}
                    >
                      <Plus size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-center">Add Block Below</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                <PopoverAnchor asChild>
                  <div 
                    ref={dragHandleRef}
                    className="drag-handle-wrapper cursor-pointer" 
                    onPointerDown={handlePointerDown}
                  >
                    <GripVertical size={18} />
                  </div>
                </PopoverAnchor>
                <PopoverContent 
                  onInteractOutside={(e) => {
                    if (dragHandleRef.current?.contains(e.target as Node)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-auto p-1"
                >
                  <button onClick={handleDuplicate} className="flex items-center w-full text-left p-2 rounded-sm hover:bg-accent">
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Duplicate</span>
                  </button>
                  <button onClick={handleCopy} className="flex items-center w-full text-left p-2 rounded-sm hover:bg-accent">
                    <Clipboard className="mr-2 h-4 w-4" />
                    <span>Copy to clipboard</span>
                  </button>
                  <button onClick={handleDelete} className="flex items-center w-full text-left p-2 rounded-sm hover:bg-accent text-red-500">
                    <Trash className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          </DragHandleReact>

          <BubbleMenu 
            editor={editor} 
            className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-md border border-gray-200 dark:border-gray-700 flex gap-1 items-center"
          >
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.chain().focus().toggleBold().run();
                }}
                className={`p-1 rounded ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>
                <BoldIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.chain().focus().toggleItalic().run();
                }}
                className={`p-1 rounded ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>
                <ItalicIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.chain().focus().toggleStrike().run();
                }}
                className={`p-1 rounded ${editor.isActive('strike') ? 'bg-gray-200 dark:bg-ray-700' : ''}`}>
                <Strikethrough className="w-5 h-5" />
              </button>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }}
                className={`p-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>
                <Heading1 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }}
                className={`p-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>
                <Heading2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }}
                className={`p-1 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>
                <Heading3 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.chain().focus().toggleBlockquote().run()
                }}
                className={`p-1 rounded ${editor.isActive('blockquote') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>
                <Quote className="w-5 h-5" />
              </button>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  const url = window.prompt('URL');
                  if (url) {
                    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                  }
                }}
                className={`p-1 rounded ${editor.isActive('link') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>
                <LinkIcon className="w-5 h-5" />
              </button>
          </BubbleMenu>
        </>
      )}

      <EditorContent editor={editor} />

      {editor && (
        <div className="flex justify-end text-sm text-gray-500 mt-1">
          <span>
            {editor.storage.characterCount.characters()} characters / {editor.storage.characterCount.words()} words
          </span>
        </div>
      )}
    </div>
  );
};

export default TiptapEditor;
