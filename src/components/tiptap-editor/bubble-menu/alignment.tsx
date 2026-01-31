import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown
} from 'lucide-react';
import { FC } from 'react';

import { BubbleMenuItem } from '.';
import { Editor } from '@tiptap/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export const BubbleMenuAlignment: FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const alignmentOptions: BubbleMenuItem[] = [
    {
      name: 'left',
      isActive: () => editor.isActive({ textAlign: 'left' }),
      command: () => editor.chain().focus().setTextAlign('left').run(),
      icon: 'AlignLeft',
    },
    {
      name: 'center',
      isActive: () => editor.isActive({ textAlign: 'center' }),
      command: () => editor.chain().focus().setTextAlign('center').run(),
      icon: 'AlignCenter',
    },
    {
      name: 'right',
      isActive: () => editor.isActive({ textAlign: 'right' }),
      command: () => editor.chain().focus().setTextAlign('right').run(),
      icon: 'AlignRight',
    },
    {
      name: 'justify',
      isActive: () => editor.isActive({ textAlign: 'justify' }),
      command: () => editor.chain().focus().setTextAlign('justify').run(),
      icon: 'AlignJustify',
    },
  ];

  const activeAlignment = alignmentOptions.find(option => option.isActive());

  const getIcon = (name: string) => {
    switch (name) {
      case 'left':
        return <AlignLeft className="h-4 w-4" />;
      case 'center':
        return <AlignCenter className="h-4 w-4" />;
      case 'right':
        return <AlignRight className="h-4 w-4" />;
      case 'justify':
        return <AlignJustify className="h-4 w-4" />;
      default:
        return <AlignLeft className="h-4 w-4" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="gap-1 rounded-md p-2 hover:bg-accent data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
        >
          <span className="flex items-center">
            {activeAlignment ? getIcon(activeAlignment.name) : <AlignLeft className="h-4 w-4" />}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent sideOffset={5} className="w-fit p-1">
        <div className="flex flex-col">
          {alignmentOptions.map((option, index) => (
            <button
              key={index}
              onClick={option.command}
              className="flex items-center gap-2 rounded-md p-2 hover:bg-accent"
            >
              {getIcon(option.name)} {option.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
