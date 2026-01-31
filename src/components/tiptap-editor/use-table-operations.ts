
'use client';

import { Editor } from '@tiptap/react';
import { CellSelection, TableMap } from '@tiptap/pm/tables';
import { ResolvedPos, Node, Fragment } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Finds the table node and its start and end positions from a given resolved position.
 * @param {ResolvedPos} $pos - The resolved position to search from.
 * @returns {{pos: number, end: number, node: Node} | undefined} - An object containing the table's start position, end position, and the table node itself, or undefined if no table is found.
 */
export const findTable = ($pos: ResolvedPos) => {
    for (let d = $pos.depth; d > 0; d--) {
      const node = $pos.node(d);
      if (node.type.spec.tableRole === 'table') {
        return {
          pos: $pos.start(d),
          end: $pos.end(d),
          node,
        };
      }
    }
    return undefined;
};

/**
 * A hook that provides a set of functions for manipulating tables in the Tiptap editor.
 * @param {Editor} editor - The Tiptap editor instance.
 * @param {number | null} cellPos - The position of the cell that the user is interacting with, or null if there is no interaction.
 * @returns {{moveRow: (direction: 'up' | 'down') => void, moveColumn: (direction: 'left' | 'right') => void, sortColumn: (order: 'asc' | 'desc') => void, duplicate: (type: 'row' | 'column') => void, clearSelectedCellsContents: () => void, canSort: boolean}} - An object containing the table operation functions and a boolean indicating if sorting is possible.
 */
export const useTableOperations = (editor: Editor, cellPos: number | null) => {
    /**
     * Moves the currently selected row up or down.
     * @param {'up' | 'down'} direction - The direction to move the row.
     */
    const moveRow = (direction: 'up' | 'down') => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        if (!(selection instanceof CellSelection)) return;
    
        const table = findTable(selection.$headCell);
        if (!table) return;
    
        const map = TableMap.get(table.node);
        const cellPosInTable = selection.$headCell.pos - table.pos;
        const { top: rowIndex } = map.findCell(cellPosInTable);
        
        const swap = direction === 'up' ? rowIndex - 1 : rowIndex + 1;
        if (swap < 0 || swap >= map.height) return;
    
        const newRows: Node[] = [];
        const originalRows = Array.from(table.node.children);
    
        for (let i = 0; i < originalRows.length; i++) {
            let newRow: Node;
            if (i === rowIndex) {
                newRow = originalRows[i].type.create(originalRows[i].attrs, originalRows[swap].content);
            } else if (i === swap) {
                newRow = originalRows[i].type.create(originalRows[i].attrs, originalRows[rowIndex].content);
            } else {
                newRow = originalRows[i];
            }
            newRows.push(newRow);
        }
    
        const newTableNode = editor.schema.nodes.table.create(table.node.attrs, Fragment.from(newRows));
        let tr = state.tr.delete(table.pos, table.end);
        const insertPos = tr.mapping.map(table.pos);
        tr = tr.insert(insertPos, newTableNode);
    
        dispatch(tr);
    }
    
    /**
     * Moves the currently selected column left or right.
     * @param {'left' | 'right'} direction - The direction to move the column.
     */
    const moveColumn = (direction: 'left' | 'right') => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        if (!(selection instanceof CellSelection)) return;
      
        const table = findTable(selection.$headCell);
        if (!table) return;
      
        const map = TableMap.get(table.node);
        const cellPosInTable = selection.$headCell.pos - table.pos;
        const { left: colIndex } = map.findCell(cellPosInTable);
      
        const swap = direction === 'left' ? colIndex - 1 : colIndex + 1;
        if (swap < 0 || swap >= map.width) return;
    
        const oldColWidths = table.node.attrs.colwidth || [];
        const newColWidths = [...oldColWidths];
        if (colIndex < newColWidths.length && swap < newColWidths.length) {
            const tempWidth = newColWidths[colIndex];
            newColWidths[colIndex] = newColWidths[swap];
            newColWidths[swap] = tempWidth;
        }
    
        const newTableRows: Node[] = [];
        for (let rowIndex = 0; rowIndex < map.height; rowIndex++) {
          const originalRow = table.node.child(rowIndex);
          const newCells: Node[] = [];
          
          for (let cellIndex = 0; cellIndex < originalRow.childCount; cellIndex++) {
            let cellToMove: Node;

            if (cellIndex === colIndex) {
              cellToMove = originalRow.child(swap);
            } else if (cellIndex === swap) {
              cellToMove = originalRow.child(colIndex);
            } else {
              cellToMove = originalRow.child(cellIndex);
            }
            newCells.push(cellToMove);
          }
      
          newTableRows.push(originalRow.type.create(originalRow.attrs, Fragment.from(newCells)));
        }
        
        const newTableAttrs = { ...table.node.attrs, colwidth: newColWidths };
        const newTableNode = editor.schema.nodes.table.create(newTableAttrs, Fragment.from(newTableRows));
        let tr = state.tr.delete(table.pos, table.end);
        const insertPos = tr.mapping.map(table.pos);
        tr = tr.insert(insertPos, newTableNode);
    
        dispatch(tr);
    }

    /**
     * Sorts the currently selected column in ascending or descending order.
     * @param {'asc' | 'desc'} order - The order to sort the column.
     */
    const sortColumn = (order: 'asc' | 'desc') => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        if (!(selection instanceof CellSelection)) return;
    
        const table = findTable(selection.$headCell);
        if (!table) return;
    
        const map = TableMap.get(table.node);
        const cellPosInTable = selection.$headCell.pos - table.pos;
        const { left: colIndex } = map.findCell(cellPosInTable);
    
        let headerRow: Node | null = null;
        let dataRows: Node[] = [];
    
        const originalRows = Array.from(table.node.children);
        if (originalRows.length === 0) return;
    
        const firstRowIsHeader = originalRows[0].child(0).type.name === 'tableHeader';
        if (firstRowIsHeader) {
            headerRow = originalRows[0];
            dataRows = originalRows.slice(1);
        } else {
            dataRows = originalRows;
        }
    
        if (dataRows.length <= 1) return; // Nothing to sort
    
        const sortedDataRows = [...dataRows].sort((rowA, rowB) => {
            const cellA = rowA.child(colIndex);
            const cellB = rowB.child(colIndex);
            const valueA = cellA.textContent.trim();
            const valueB = cellB.textContent.trim();
    
            const comparison = valueA.localeCompare(valueB, undefined, { numeric: true });
            return order === 'asc' ? comparison : -comparison;
        });
    
        const newRows = headerRow ? [headerRow, ...sortedDataRows] : sortedDataRows;
        const newTableNode = editor.schema.nodes.table.create(table.node.attrs, Fragment.from(newRows));
    
        let tr = state.tr.delete(table.pos, table.end);
        const insertPos = tr.mapping.map(table.pos);
        tr = tr.insert(insertPos, newTableNode);
    
        dispatch(tr);
    }
    
    /**
     * Duplicates the currently selected row or column.
     * @param {'row' | 'column'} type - The type of element to duplicate.
     */
    const duplicate = (type: 'row' | 'column') => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        if (!(selection instanceof CellSelection)) return;
    
        const table = findTable(selection.$headCell);
        if (!table) return;
    
        if (type === 'row') {
          const $row = state.doc.resolve(selection.$headCell.pos - selection.$headCell.parentOffset - 1);
          const tableRow = $row.nodeAfter;
          if (!tableRow || tableRow.type.name !== 'tableRow') return;
    
          const insertPos = $row.pos + tableRow.nodeSize;
          const rowJSON = tableRow.toJSON();
          editor.chain().focus().insertContentAt(insertPos, rowJSON).run();
    
        } else { // column
          const map = TableMap.get(table.node);
          const { left: colIndex } = map.findCell(selection.$headCell.pos - table.pos);
    
          let tr = state.tr;
    
          // Iterate backwards to avoid position invalidation
          for (let rowIndex = map.height - 1; rowIndex >= 0; rowIndex--) {
            const rowNode = table.node.child(rowIndex);
            const cellNode = rowNode.child(colIndex);
            
            let currentCellPos = table.pos + 1;
            for (let i = 0; i < rowIndex; i++) {
                currentCellPos += table.node.child(i).nodeSize;
            }
    
            let insertPos = currentCellPos;
            for (let i = 0; i <= colIndex; i++) {
                insertPos += rowNode.child(i).nodeSize;
            }
    
            tr = tr.insert(insertPos, cellNode.copy(cellNode.content));
          }
          dispatch(tr);
        }
    }
    
    /**
     * Clears the contents of the currently selected cells.
     */
    const clearSelectedCellsContents = () => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        let tr = state.tr;
    
        const createEmptyParagraph = () => {
            return state.schema.nodes.paragraph.create(null, state.schema.text('\u200B'));
        }
    
        if (selection instanceof CellSelection) {
            const cells: {pos: number, node: Node}[] = [];
            selection.forEachCell((node, pos) => {
                cells.push({node, pos});
            });
    
            for (let i = cells.length - 1; i >= 0; i--) {
                const { pos, node } = cells[i];
                tr.setNodeMarkup(pos, node.type, { ...node.attrs, backgroundColor: null });
                const from = pos + 1;
                const to = from + node.content.size;
                tr.replaceWith(from, to, createEmptyParagraph());
            }
        }
    
        dispatch(tr);
    };

    /**
     * A boolean indicating if the current table can be sorted.
     * Sorting is possible if the table has more than one data row.
     * @type {boolean}
     */
    const table = cellPos ? findTable(editor.state.doc.resolve(cellPos)) : null;
    const canSort = !!(table && table.node.childCount > (table.node.child(0).child(0).type.name === 'tableHeader' ? 2 : 1));

    return { moveRow, moveColumn, sortColumn, duplicate, clearSelectedCellsContents, canSort };
}
