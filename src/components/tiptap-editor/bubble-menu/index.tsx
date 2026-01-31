import { BubbleMenu, BubbleMenuProps } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { FC, useState, useEffect } from 'react';
import { CellSelection } from 'prosemirror-tables';

import { BubbleMenuButton, BubbleMenuButtonProps } from './button';
import { BubbleMenuLink } from './link';
import { BubbleMenuAlignment } from './alignment';

export interface BubbleMenuItem extends BubbleMenuButtonProps {
  name: string;
}

type EditorBubbleMenuProps = Omit<BubbleMenuProps, 'children'>;

export const EditorBubbleMenu: FC<EditorBubbleMenuProps> = (props) => {
  const { editor } = props;
  const [isLinkOpen, setIsLinkOpen] = useState(false);

  if (!editor) {
    return null;
  }

  useEffect(() => {
    const handleUpdate = () => {
      const { selection } = editor.state;
      const isCellSelection = selection instanceof CellSelection;
      const isTextSelection = !selection.empty;

      if (!isTextSelection || isCellSelection) {
        setIsLinkOpen(false);
      }
    };

    const handleBlur = () => {
      setIsLinkOpen(false);
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('blur', handleBlur);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('blur', handleBlur);
    };
  }, [editor]);

  const items: BubbleMenuItem[] = [
    {
      name: 'bold',
      isActive: () => editor.isActive('bold'),
      command: () => editor.chain().focus().toggleBold().run(),
      icon: 'Bold',
    },
    {
      name: 'italic',
      isActive: () => editor.isActive('italic'),
      command: () => editor.chain().focus().toggleItalic().run(),
      icon: 'Italic',
    },
    {
      name: 'underline',
      isActive: () => editor.isActive('underline'),
      command: () => editor.chain().focus().toggleUnderline().run(),
      icon: 'Underline',
    },
    {
      name: 'strike',
      isActive: () => editor.isActive('strike'),
      command: () => editor.chain().focus().toggleStrike().run(),
      icon: 'Strikethrough',
    },
    {
      name: 'code',
      isActive: () => editor.isActive('code'),
      command: () => editor.chain().focus().toggleCode().run(),
      icon: 'Code',
    },
    {
      name: 'codeBlock',
      isActive: () => editor.isActive('codeBlock'),
      command: () => editor.chain().focus().toggleCodeBlock().run(),
      icon: 'SquareCode',
    },
  ];

  return (
    <BubbleMenu
      {...props}
      updateDelay={100}
      shouldShow={({ view, state, from, to }) => {
        const { selection } = state;
        
        // Do not show for cell selections
        if (selection instanceof CellSelection) {
            return false;
        }

        // Only show for regular text selections
        if (view.hasFocus() && from !== to) {
          return true;
        }

        return false;
      }}
      className="flex w-fit max-w-[22rem] overflow-x-auto rounded-md border border-border bg-background shadow-lg"
    >
      {!isLinkOpen && (
        <div className="flex items-center">
          {items.map((item, index) => (
            <BubbleMenuButton key={index} {...item} />
          ))}
          <div className="mx-1 h-6 w-px bg-border" />
          <BubbleMenuAlignment editor={editor} />
        </div>
      )}
      <BubbleMenuLink
        editor={editor}
        isOpen={isLinkOpen}
        setIsOpen={setIsLinkOpen}
      />
    </BubbleMenu>
  );
};
