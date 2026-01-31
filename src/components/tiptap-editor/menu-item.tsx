'use client';

import { cn } from '@/lib/utils';
import React from 'react';
import { Check } from 'lucide-react';

// Use ButtonHTMLAttributes to get button-specific props like 'disabled'
interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  isActive?: boolean;
  isDestructive?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({ icon, children, className, isActive, isDestructive, ...props }) => {
  return (
    <button
      className={cn(
        'flex items-center w-full text-left text-sm p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300': isActive,
          'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400': isDestructive,
        },
        className
      )}
      {...props} // 'disabled' prop will be passed here
    >
      <div className="w-6 h-6 mr-2 flex items-center justify-center">{icon}</div>
      {children}
      {isActive && <Check className="ml-auto h-4 w-4 text-blue-700 dark:text-blue-300" />}
    </button>
  );
};
