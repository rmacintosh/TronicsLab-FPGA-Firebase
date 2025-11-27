'use client';

import React, { useState, useMemo } from 'react';
import { icons } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import DynamicIcon from '@/components/icons/dynamic-icon';

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  placeholder?: string;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, placeholder = 'Select an icon' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const iconNames = useMemo(() => Object.keys(icons), []);

  const filteredIcons = useMemo(() => {
    if (!searchTerm) return iconNames;
    return iconNames.filter(name =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, iconNames]);

  const handleIconSelect = (iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {value ? (
            <div className="flex items-center">
              <DynamicIcon name={value} className="mr-2 h-4 w-4" />
              <span>{value}</span>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select an Icon</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <Input
            placeholder="Search for an icon..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <div className="grid grid-cols-8 gap-4 max-h-[400px] overflow-y-auto">
            {filteredIcons.map(iconName => (
              <Button
                key={iconName}
                variant="outline"
                className="flex flex-col h-24 items-center justify-center"
                onClick={() => handleIconSelect(iconName)}
              >
                <DynamicIcon name={iconName} size={24} />
                <span className="text-xs mt-2 truncate">{iconName}</span>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IconPicker;
