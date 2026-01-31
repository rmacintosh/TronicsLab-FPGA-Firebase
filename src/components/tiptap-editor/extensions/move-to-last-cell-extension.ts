
import { Extension, RawCommands } from '@tiptap/core';
import { findParentNode } from 'prosemirror-utils';
import { TextSelection, EditorState, Transaction, Selection } from 'prosemirror-state';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        moveToLastCell: {
            /**
             * Moves the selection to the last cell of a table.
             */
            moveToLastCell: () => ReturnType;
        };
    }
}

export const MoveToLastCell = Extension.create({
  name: 'moveToLastCell',

  addCommands() {
    return {
      moveToLastCell: () => ({ state, dispatch }: { state: EditorState, dispatch?: (tr: Transaction) => void }) => {
        const { selection } = state;
        const table = findParentNode((node) => node.type.name === 'table')(selection);

        if (!table) {
          return false;
        }

        const tableEndPos = table.start + table.node.nodeSize - 2;
        const selectionAtEnd = TextSelection.near(state.doc.resolve(tableEndPos), -1);
        const lastCell = findParentNode((node) => node.type.name === 'tableCell' || node.type.name === 'tableHeader')(selectionAtEnd);

        if (!lastCell) {
          return false;
        }

        const newPos = lastCell.start + 1;
        const newSelection = TextSelection.create(state.doc, newPos);

        if (dispatch) {
          dispatch(state.tr.setSelection(newSelection));
        }

        return true;
      },
    };
  },
});
