import { Editor, Range } from '@tiptap/core';
import React from 'react';

export interface CommandItem {
  title: string;
  command: (props: { editor: Editor; range: Range }) => void;
  icon: React.ElementType;
  can: () => boolean;
  isActive?: () => boolean;
  group: string;
}
