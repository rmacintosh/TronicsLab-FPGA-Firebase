import { Editor } from '@tiptap/react';
import { Dispatch, FC, SetStateAction, useCallback } from 'react';
import { Check, Trash, X } from 'lucide-react';

import { BubbleMenuButton } from './button';

interface BubbleMenuLinkProps {
  editor: Editor;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export const BubbleMenuLink: FC<BubbleMenuLinkProps> = ({ editor, isOpen, setIsOpen }) => {
  const handleLink = useCallback((url: string) => {
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex items-center">
      {!isOpen && (
        <BubbleMenuButton
          icon="Link"
          isActive={() => editor.isActive('link')}
          command={() => setIsOpen(true)}
        />
      )}
      {isOpen && (
        <div className="flex items-center gap-1 p-1">
          <input
            type="text"
            placeholder="Enter link..."
            defaultValue={editor.getAttributes('link').href || ''}
            onChange={(e) => handleLink(e.target.value)}
            className="w-40 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <BubbleMenuButton
            icon="Trash"
            isActive={() => false}
            command={() => {
              handleLink('');
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
