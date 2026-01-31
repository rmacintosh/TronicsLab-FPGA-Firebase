'use client';

import { Editor } from '@tiptap/core';
import { useEffect, useState, useCallback } from 'react';

interface TableQuickAddMenuProps {
  editor: Editor;
  isCellMenuOpen: boolean;
}

interface MenuState {
  top: number;
  left: number;
  width: number;
  height: number;
  showColumnAdd: boolean;
  showRowAdd: boolean;
}

export const TableQuickAddMenu = ({ editor, isCellMenuOpen }: TableQuickAddMenuProps) => {
  const [menuState, setMenuState] = useState<MenuState | null>(null);

  const calculatePosition = useCallback(
    (event: MouseEvent, force = false) => {
      const { view } = editor;

      if (!force && (event.target as Element)?.closest('#table-quick-add-col-button, #table-quick-add-row-button')) {
        return;
      }

      const allTables = Array.from(view.dom.querySelectorAll('table'));
      if (allTables.length === 0) {
        if (menuState !== null) setMenuState(null);
        return;
      }

      let targetTable: HTMLTableElement | null = null;
      const buffer = 28;

      for (const table of allTables) {
        const rect = table.getBoundingClientRect();
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right + buffer &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom + buffer
        ) {
          targetTable = table;
          break;
        }
      }

      if (!targetTable) {
        if (menuState !== null) setMenuState(null);
        return;
      }

      const editorRect = view.dom.getBoundingClientRect();
      const tableRect = targetTable.getBoundingClientRect();

      const lastRowElement = targetTable.querySelector('tr:last-child');
      if (!lastRowElement) return;
      const lastRowRect = lastRowElement.getBoundingClientRect();

      const lastRowCells = lastRowElement.querySelectorAll('td, th');
      if (lastRowCells.length === 0) return;
      const lastCellInRow = lastRowCells[lastRowCells.length - 1];
      const lastCellRect = lastCellInRow.getBoundingClientRect();

      const mouseX = event.clientX;
      const mouseY = event.clientY;

      const isHoveringLastColumn = mouseX >= lastCellRect.left && mouseX <= lastCellRect.right && mouseY >= tableRect.top && mouseY <= tableRect.bottom;
      const isHoveringRightBuffer = mouseX >= tableRect.right && mouseX <= tableRect.right + buffer && mouseY >= tableRect.top && mouseY <= tableRect.bottom;
      const showColumnAdd = isHoveringLastColumn || isHoveringRightBuffer;

      const isHoveringLastRow = mouseX >= tableRect.left && mouseX <= tableRect.right && mouseY >= lastRowRect.top && mouseY <= lastRowRect.bottom;
      const isHoveringBottomBuffer = mouseX >= tableRect.left && mouseX <= tableRect.right && mouseY >= tableRect.bottom && mouseY <= tableRect.bottom + buffer;
      const showRowAdd = isHoveringLastRow || isHoveringBottomBuffer;

      const newState = {
        top: tableRect.top - editorRect.top,
        left: tableRect.left - editorRect.left,
        width: tableRect.width,
        height: tableRect.height,
        showColumnAdd,
        showRowAdd,
      };

      if (JSON.stringify(menuState) === JSON.stringify(newState)) {
        return;
      }
      
      setMenuState(newState);
    },
    [editor, menuState]
  );

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => requestAnimationFrame(() => calculatePosition(event));
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [calculatePosition]);

  if (!menuState) return null;

  const addColumnAfter = (event: React.MouseEvent) => {
    event.preventDefault();
    editor.chain().focus().moveToLastCell().addColumnAfter().run();
    requestAnimationFrame(() => calculatePosition(event.nativeEvent, true));
  };

  const addRowAfter = (event: React.MouseEvent) => {
    event.preventDefault();
    editor.chain().focus().moveToLastCell().addRowAfter().run();
    requestAnimationFrame(() => calculatePosition(event.nativeEvent, true));
  };

  return (
    <>
      <button
        id="table-quick-add-col-button"
        type="button"
        contentEditable="false"
        suppressContentEditableWarning={true}
        className="absolute flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white transition-opacity rounded-full cursor-pointer"
        style={{
          top: menuState.top,
          left: menuState.left + menuState.width + 4,
          width: '15px',
          height: menuState.height,
          opacity: menuState.showColumnAdd && !isCellMenuOpen ? 1 : 0,
          pointerEvents: menuState.showColumnAdd && !isCellMenuOpen ? 'auto' : 'none',
          zIndex: 20,
        }}
        onMouseDown={addColumnAfter}
      >+</button>

      <button
        id="table-quick-add-row-button"
        type="button"
        contentEditable="false"
        suppressContentEditableWarning={true}
        className="absolute flex justify-center items-center bg-gray-800 hover:bg-gray-700 text-white transition-opacity rounded-full cursor-pointer"
        style={{
          top: menuState.top + menuState.height + 4,
          left: menuState.left,
          height: '15px',
          width: menuState.width,
          opacity: menuState.showRowAdd && !isCellMenuOpen ? 1 : 0,
          pointerEvents: menuState.showRowAdd && !isCellMenuOpen ? 'auto' : 'none',
          zIndex: 20,
        }}
        onMouseDown={addRowAfter}
      >+</button>
    </>
  );
};
