import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    deleteBlock: {
      /**
       * Deletes the current block node.
       */
      deleteBlock: () => ReturnType;
    };
  }
}

export const DeleteBlock = Extension.create({
  name: 'deleteBlock',

  addCommands() {
    return {
      deleteBlock: () => ({ state, chain }) => {
        const { $from } = state.selection;
        // The drag handle is on nodes at depth 1 (direct children of the doc)
        const node = $from.node(1);
        const start = $from.before(1);
        
        if (node) {
            const end = start + node.nodeSize;
            return chain().focus().deleteRange({ from: start, to: end }).run();
        }

        return false;
      },
    };
  },
});
