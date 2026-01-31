'use client';

import { Editor } from '@tiptap/core';
import { DragHandle as DragHandleReact } from '@tiptap/extension-drag-handle-react';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { offset, shift } from '@floating-ui/dom';
import {
  GripVertical,
  Plus,
  Trash,
  Copy,
  Clipboard,
  Check,
  Pilcrow,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  TextQuote,
  RefreshCw,
  ListChecks,
  Code,
  ChevronRight,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { hoverHighlightPluginKey } from './extensions/hover-highlight-extension';

interface DragHandleProps {
  editor: Editor;
  menuOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const DragHandle = ({ editor, menuOpen, onOpenChange }: DragHandleProps) => {
  const [activeNodePos, setActiveNodePos] = useState<number | null>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const popoverContentRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (menuOpen || subMenuOpen) {
      setTooltipOpen(false);
      const lockTimer = setTimeout(() => editor.commands.lockDragHandle(), 20);
      return () => clearTimeout(lockTimer);
    } else {
      editor.commands.unlockDragHandle();
    }
  }, [menuOpen, subMenuOpen, editor]);

  const handleTooltipOpenChange = (isOpen: boolean) => {
    setTooltipOpen(isOpen && !menuOpen);
  };

  const handleCopy = () => {
    if (activeNodePos === null) return;
    editor.chain().focus().setNodeSelection(activeNodePos).run();
    editor.commands.copyNodeToClipboard();
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (activeNodePos === null) return;
    editor.chain().focus().setNodeSelection(activeNodePos).deleteSelection().run();
    onOpenChange(false);
  };

  const handleDuplicate = () => {
    if (activeNodePos === null) return;
    editor.chain().focus().setNodeSelection(activeNodePos).run();
    editor.commands.duplicateNode();
    onOpenChange(false);
  };

  const handleDragHandleMouseLeave = () => {
    if (!document.body.classList.contains('editor-is-dragging') && !menuOpen) {
      editor.view.dispatch(editor.state.tr.setMeta(hoverHighlightPluginKey, { remove: true }));
    }
  };

  const handleNodeChange = (data: { pos: number }) => {
    if (menuOpen) return;
    if (data.pos >= 0) {
      editor.view.dispatch(editor.view.state.tr.setMeta(hoverHighlightPluginKey, { add: { pos: data.pos } }));
      setActiveNodePos(data.pos);
    }
  };

  const createTurnIntoCommand = (command: () => void) => {
    return () => {
      command();
      onOpenChange(false);
      setSubMenuOpen(false);
    };
  };

  const turnIntoOptions = [
    {
      name: 'Text',
      icon: Pilcrow,
      command: createTurnIntoCommand(() => editor.chain().focus().setParagraph().run()),
      isActive: editor.isActive('paragraph'),
    },
    {
      name: 'Heading 1',
      icon: Heading1,
      command: createTurnIntoCommand(() => editor.chain().focus().toggleHeading({ level: 1 }).run()),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      name: 'Heading 2',
      icon: Heading2,
      command: createTurnIntoCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run()),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      name: 'Heading 3',
      icon: Heading3,
      command: createTurnIntoCommand(() => editor.chain().focus().toggleHeading({ level: 3 }).run()),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    {
      name: 'Bullet List',
      icon: List,
      command: createTurnIntoCommand(() => editor.chain().focus().toggleBulletList().run()),
      isActive: editor.isActive('bulletList'),
    },
    {
      name: 'Ordered List',
      icon: ListOrdered,
      command: createTurnIntoCommand(() => editor.chain().focus().toggleOrderedList().run()),
      isActive: editor.isActive('orderedList'),
    },
    {
      name: 'Task List',
      icon: ListChecks,
      command: createTurnIntoCommand(() => editor.chain().focus().toggleTaskList().run()),
      isActive: editor.isActive('taskList'),
    },
    {
      name: 'Blockquote',
      icon: TextQuote,
      command: createTurnIntoCommand(() => editor.chain().focus().toggleBlockquote().run()),
      isActive: editor.isActive('blockquote'),
    },
    {
      name: 'Code Block',
      icon: Code,
      command: createTurnIntoCommand(() => editor.chain().focus().toggleCodeBlock().run()),
      isActive: editor.isActive('codeBlock'),
    },
  ];

  return (
    <DragHandleReact
      pluginKey="dragHandle"
      editor={editor}
      className="handle-wrapper"
      onNodeChange={handleNodeChange}
      computePositionConfig={{
        placement: 'left-start',
        middleware: [offset({ mainAxis: 25, crossAxis: 0 }), shift({ padding: 10 })],
      }}
    >
      <div onMouseLeave={handleDragHandleMouseLeave} contentEditable={false} className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="add-button"
                onClick={() => {
                  if (activeNodePos === null) return;
                  const node = editor.state.doc.nodeAt(activeNodePos);
                  if (!node) return;
                  const insertPos = activeNodePos + node.nodeSize;
                  editor.chain().focus().insertContentAt(insertPos, '<p></p>').run();
                }}
              >
                <Plus className="h-[1em] w-[1em]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={menuOpen ? 'bottom' : 'top'}>
              <p className="text-center">Add Block Below</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Popover open={menuOpen} onOpenChange={onOpenChange}>
          <PopoverAnchor asChild>
            <div
              ref={dragHandleRef}
              className={`drag-handle-wrapper group cursor-pointer p-1 rounded-sm transition-colors hover:bg-accent ${menuOpen ? 'bg-accent' : ''}`}
              onPointerUp={(e) => {
                if (document.body.classList.contains('editor-is-dragging')) return;
                e.stopPropagation();
                if (!menuOpen && activeNodePos !== null) {
                  editor.chain().setNodeSelection(activeNodePos).run();
                }
                onOpenChange(!menuOpen);
              }}
            >
              <TooltipProvider>
                <Tooltip open={tooltipOpen} onOpenChange={handleTooltipOpenChange}>
                  <TooltipTrigger asChild>
                    <GripVertical
                      className={`h-[1em] w-[1em] transition-colors group-hover:text-accent-foreground ${menuOpen ? 'text-accent-foreground' : ''}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">Click for Options<br />Hold for Drag</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </PopoverAnchor>
          <PopoverContent
            ref={popoverContentRef}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              if (dragHandleRef.current?.contains(e.target as Node) || subMenuRef.current?.contains(e.target as Node)) {
                e.preventDefault();
              }
            }}
            className="w-48 p-1"
            sideOffset={10}
          >
            <div className="flex flex-col">
              <button
                onClick={handleDuplicate}
                className="flex items-center w-full text-left p-1 rounded-sm text-sm hover:bg-accent"
              >
                <Copy className="mr-2 h-4 w-4" />
                <span>Duplicate</span>
              </button>
              <button onClick={handleCopy} className="flex items-center w-full text-left p-1 rounded-sm text-sm hover:bg-accent">
                <Clipboard className="mr-2 h-4 w-4" />
                <span>Copy to clipboard</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center w-full text-left p-1 rounded-sm text-sm text-red-500 hover:bg-red-500 hover:text-white"
              >
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </button>
              <div className="border-t my-1" />

              <Popover open={subMenuOpen} onOpenChange={setSubMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    onMouseEnter={() => setSubMenuOpen(true)}
                    className="flex items-center w-full text-left p-1 rounded-sm text-sm hover:bg-accent"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    <span>Turn Into</span>
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  ref={subMenuRef}
                  side="right"
                  align="start"
                  sideOffset={8}
                  className="w-48 p-1"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="text-xs text-muted-foreground p-1">TURN INTO</div>
                  <div className="flex flex-col">
                    {turnIntoOptions.map((option, index) => (
                      <button
                        key={index}
                        onClick={option.command}
                        className={`flex items-center w-full text-left p-1 rounded-sm text-sm hover:bg-accent ${option.isActive ? 'bg-accent' : ''}`}
                      >
                        <option.icon className="mr-2 h-4 w-4" />
                        <span className="flex-grow">{option.name}</span>
                        {option.isActive && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </DragHandleReact>
  );
};
