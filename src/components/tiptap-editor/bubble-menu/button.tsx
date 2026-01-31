import { cva } from 'class-variance-authority';
import { FC } from 'react';
import { LucideIcon, icons } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface BubbleMenuButtonProps {
  icon: keyof typeof icons;
  isActive: () => boolean;
  command: () => void;
}

const bubbleMenuButtonVariants = cva(
  [
    'w-9 h-9',
    'flex items-center justify-center',
    'text-foreground',
    'rounded-md',
    'transition-colors',
    'hover:bg-accent',
    'focus-visible:bg-accent',
    'disabled:opacity-50 disabled:pointer-events-none',
  ],
  {
    variants: {
      active: {
        true: 'bg-accent',
        false: 'bg-transparent',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export const BubbleMenuButton: FC<BubbleMenuButtonProps> = ({ icon, isActive, command }) => {
  const Icon = icons[icon];
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        command();
      }}
      className={cn(bubbleMenuButtonVariants({ active: isActive() }))}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};
