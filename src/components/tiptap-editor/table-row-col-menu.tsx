'use client';

import { Editor } from '@tiptap/react';
import React, { useState, useEffect, useCallback, RefObject } from 'react';
import { CellSelection, TableMap, cellAround } from '@tiptap/pm/tables';
import { TextSelection } from '@tiptap/pm/state';
import { TableColMenu } from './table-col-menu';
import { TableRowMenu } from './table-row-menu';
import { useTableOperations, findTable } from './use-table-operations';
import './table-row-col-menu.css';

/**
 * @interface TableRowColMenuProps
 * @description Props for the TableRowColMenu component.
 * @property {Editor} editor - The Tiptap editor instance.
 * @property {RefObject<HTMLDivElement>} editorRef - A React ref to the editor's container element.
 */
interface TableRowColMenuProps {
  editor: Editor;
  editorRef: RefObject<HTMLDivElement>;
}

/**
 * @component TableRowColMenu
 * @description A React component that renders the row and column menus for a table in the Tiptap editor.
 * It tracks the mouse position to show the menus when hovering over the table's edges.
 * @param {TableRowColMenuProps} props - The component props.
 * @returns {React.ReactElement | null} - The rendered component or null if the menu is not active.
 */
const TableRowColMenu: React.FC<TableRowColMenuProps> = ({ editor, editorRef }) => {
  /**
   * @state menuState
   * @description Stores the state of the table menus, including visibility, position, and information about the currently hovered cell.
   */
  const [menuState, setMenuState] = useState({
    show: false,
    topButtonStyle: {},
    leftButtonStyle: {},
    cellPos: null as number | null,
    isFirstRow: false,
    isLastRow: false,
    isFirstCol: false,
    isLastCol: false,
    isHeaderRow: false,
    isHeaderCol: false,
  });
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const [isRowMenuOpen, setIsRowMenuOpen] = useState(false);
  const isAMenuOpen = isColMenuOpen || isRowMenuOpen;

  const { moveRow, moveColumn, sortColumn, duplicate, clearSelectedCellsContents, canSort } = useTableOperations(editor, menuState.cellPos);

  /**
   * @function handleMouseMove
   * @description A memoized callback that handles the mouse move event to determine if and where to show the table menus.
   * It calculates the position of the hovered cell and updates the menuState accordingly.
   */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isAMenuOpen) return;

    const editorContainer = editorRef.current;
    if (!editorContainer) return;

    const editorRect = editorContainer.getBoundingClientRect();
    const editorView = editor.view;

    const buffer = 20;
    const tables = Array.from(editorContainer.querySelectorAll('table'));
    const hoveredTable = tables.find(t => {
        const r = t.getBoundingClientRect();
        return event.clientX >= r.left - buffer && event.clientX <= r.right + buffer &&
               event.clientY >= r.top - buffer && event.clientY <= r.bottom + buffer;
    });

    if (!hoveredTable) {
        if (menuState.show) {
            setMenuState(prev => ({...prev, show: false, cellPos: null}));
        }
        return;
    }

    const coords = editorView.posAtCoords({ left: event.clientX, top: event.clientY });
    if (!coords) return;

    const $pos = editor.state.doc.resolve(coords.pos);
    const $cellPos = cellAround($pos);
    if (!$cellPos) return;

    const cellDomNode = editorView.nodeDOM($cellPos.pos) as HTMLElement | null;
    if (!cellDomNode || !hoveredTable.contains(cellDomNode)) return;

    const tableResult = findTable($pos);
    if (!tableResult) return;
    const tableNode = tableResult.node;
    const map = TableMap.get(tableNode);
    const cellPosInTable = $cellPos.pos - tableResult.pos;
    const { top: rowIndex, left: colIndex } = map.findCell(cellPosInTable);

    let isHeaderRow = true;
    const currentRow = tableNode.child(rowIndex);
    for (let i = 0; i < currentRow.childCount; i++) {
        if (currentRow.child(i).type.name !== 'tableHeader') {
            isHeaderRow = false;
            break;
        }
    }

    let isHeaderCol = true;
    for (let i = 0; i < map.height; i++) {
        const cellIndex = i * map.width + colIndex;
        const cellNode = tableNode.nodeAt(map.map[cellIndex]);
        if (cellNode && cellNode.type.name !== 'tableHeader') {
            isHeaderCol = false;
            break;
        }
    }

    const cellRect = cellDomNode.getBoundingClientRect();
    const tableRect = hoveredTable.getBoundingClientRect();

    const barThickness = 12;
    const barOffset = barThickness + 4;

    const newState = {
        show: true,
        cellPos: $cellPos.pos,
        isFirstRow: rowIndex === 0,
        isLastRow: rowIndex === map.height - 1,
        isFirstCol: colIndex === 0,
        isLastCol: colIndex === map.width - 1,
        isHeaderRow,
        isHeaderCol,
        topButtonStyle: {
          position: 'absolute',
          top: `${tableRect.top - editorRect.top - barOffset}px`,
          left: `${cellRect.left - editorRect.left}px`,
          width: `${cellRect.width}px`,
          height: `${barThickness}px`,
        },
        leftButtonStyle: {
          position: 'absolute',
          top: `${cellRect.top - editorRect.top}px`,
          left: `${tableRect.left - editorRect.left - barOffset}px`,
          width: `${barThickness}px`,
          height: `${cellRect.height}px`,
        },
    };
    
    if (JSON.stringify(menuState) !== JSON.stringify(newState)) {
        setMenuState(newState);
    }
  }, [editor, menuState, isAMenuOpen, editorRef]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => requestAnimationFrame(() => handleMouseMove(event));
    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [handleMouseMove]);


  /**
   * @function clearSelection
   * @description Clears the current table cell selection and replaces it with a TextSelection.
   * This is necessary to prevent a Prosemirror warning when the menu is closed by clicking on a cell.
   */
  const clearSelection = () => {
    const { state, dispatch } = editor.view;
    const { tr, selection } = state;
    if (selection instanceof CellSelection) {
      const newSelection = TextSelection.near(selection.$headCell, 1);
      tr.setSelection(newSelection);
      dispatch(tr);
    }
  }

  /**
   * @function selectCol
   * @description Selects the entire column of the currently hovered cell.
   */
  const selectCol = () => {
    if (menuState.cellPos === null) return;
    const { state, dispatch } = editor.view;
    const $cell = state.doc.resolve(menuState.cellPos);

    const tableResult = findTable($cell);
    if (!tableResult) return;
    const { node: table, pos: tableStart } = tableResult;
    
    const map = TableMap.get(table);
    const cellPosInTable = menuState.cellPos - tableStart;
    const { left: colIndex } = map.findCell(cellPosInTable);
    
    const anchorPos = tableStart + map.map[colIndex];
    const headPos = tableStart + map.map[map.width * (map.height - 1) + colIndex];
    
    const $anchor = state.doc.resolve(anchorPos);
    const $head = state.doc.resolve(headPos);
    
    const selection = new CellSelection($anchor, $head);
    const { tr } = state;
    tr.setSelection(selection);
    dispatch(tr);
  };

  /**
   * @function selectRow
   * @description Selects the entire row of the currently hovered cell.
   */
  const selectRow = () => {
    if (menuState.cellPos === null) return;
    const { state, dispatch } = editor.view;
    const $cell = state.doc.resolve(menuState.cellPos);
    
    const tableResult = findTable($cell);
    if (!tableResult) return;
    const { node: table, pos: tableStart } = tableResult;

    const map = TableMap.get(table);
    const cellPosInTable = menuState.cellPos - tableStart;
    const { top: rowIndex } = map.findCell(cellPosInTable);
    
    const anchorPos = tableStart + map.map[rowIndex * map.width];
    const headPos = tableStart + map.map[rowIndex * map.width + (map.width - 1)];
    
    const $anchor = state.doc.resolve(anchorPos);
    const $head = state.doc.resolve(headPos);
    
    const selection = new CellSelection($anchor, $head);
    const { tr } = state;
    tr.setSelection(selection);
    dispatch(tr);
  };

  /**
   * @function onColOpenChange
   * @description Handles the open state of the column menu. Selects the column when the menu opens and clears the selection when it closes.
   * @param {boolean} open - The new open state of the menu.
   */
  const onColOpenChange = (open: boolean) => {
    setIsColMenuOpen(open);
    if (open) selectCol();
    else clearSelection();
  }

  /**
   * @function onRowOpenChange
   * @description Handles the open state of the row menu. Selects the row when the menu opens and clears the selection when it closes.
   * @param {boolean} open - The new open state of the menu.
   */
  const onRowOpenChange = (open: boolean) => {
    setIsRowMenuOpen(open);
    if (open) selectRow();
    else clearSelection();
  }

  if (!menuState.show && !isColMenuOpen && !isRowMenuOpen) {
    return null;
  }

  // Logic to control the visibility of the row and column menus.
  const isColVisible = (menuState.show || isColMenuOpen) && !isRowMenuOpen;
  const isRowVisible = (menuState.show || isRowMenuOpen) && !isColMenuOpen;

  return (
    <>
      <TableColMenu
        editor={editor}
        isColMenuOpen={isColMenuOpen}
        onColOpenChange={onColOpenChange}
        topButtonStyle={menuState.topButtonStyle}
        isColVisible={isColVisible}
        isFirstCol={menuState.isFirstCol}
        isLastCol={menuState.isLastCol}
        isHeaderCol={menuState.isHeaderCol}
        moveColumn={moveColumn}
        duplicate={duplicate}
        clearSelectedCellsContents={clearSelectedCellsContents}
        sortColumn={sortColumn}
        canSort={canSort}
      />
      <TableRowMenu
        editor={editor}
        isRowMenuOpen={isRowMenuOpen}
        onRowOpenChange={onRowOpenChange}
        leftButtonStyle={menuState.leftButtonStyle}
        isRowVisible={isRowVisible}
        isFirstRow={menuState.isFirstRow}
        isLastRow={menuState.isLastRow}
        isHeaderRow={menuState.isHeaderRow}
        moveRow={moveRow}
        duplicate={duplicate}
        clearSelectedCellsContents={clearSelectedCellsContents}
      />
    </>
  );
};

export default TableRowColMenu;
