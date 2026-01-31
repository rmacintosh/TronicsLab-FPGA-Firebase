'use client';

import { Editor } from '@tiptap/react';

interface EditorCharacterCountProps {
  editor: Editor;
}

export const EditorCharacterCount = ({ editor }: EditorCharacterCountProps) => {
  return (
    <div className="flex justify-end text-sm px-3 text-gray-500 mt-1">
      <span>
        {editor.storage.characterCount.characters()} characters / {editor.storage.characterCount.words()} words
      </span>
    </div>
  );
};
