
import React, { useState, useRef } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SubMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
}

export const SubMenu: React.FC<SubMenuProps> = ({ trigger, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const handleOpen = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    closeTimer.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 150); // Delay to allow cursor to move to content
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div onMouseEnter={handleOpen} onMouseLeave={handleClose}>
          {trigger}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
};
