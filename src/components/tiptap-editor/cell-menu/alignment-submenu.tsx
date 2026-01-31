import { Editor } from '@tiptap/core';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AlignmentSubMenuProps {
  editor: Editor;
}

const AlignmentSubMenu: React.FC<AlignmentSubMenuProps> = ({ editor }) => {
  const alignments = [
    { name: 'Left', icon: AlignLeft, value: 'left' },
    { name: 'Center', icon: AlignCenter, value: 'center' },
    { name: 'Right', icon: AlignRight, value: 'right' },
    { name: 'Justify', icon: AlignJustify, value: 'justify' },
  ];

  return (
    <div className="flex p-1">
      {alignments.map(({ name, icon: Icon, value }) => (
        <Button
          key={name}
          variant={editor.isActive({ textAlign: value }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().setTextAlign(value).run()}
          className="p-2"
        >
          <Icon className="w-5 h-5" />
        </Button>
      ))}
    </div>
  );
};

export default AlignmentSubMenu;
