import { Extension } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    duplicateNode: {
      /**
       * Duplicates the current node or the selected node.
       */
      duplicateNode: () => ReturnType;
    };
  }
}

export const Duplicate = Extension.create({
  name: 'duplicate',

  addCommands() {
    return {
      duplicateNode: () => ({ state, chain }) => {
        const { selection } = state;
        let node;
        let posToInsert;

        if (selection instanceof NodeSelection) {
          // Handle NodeSelection (e.g., from the drag handle menu)
          node = selection.node;
          posToInsert = selection.from + node.nodeSize;
        } else {
          // Handle TextSelection (e.g., from keyboard shortcut)
          const { $from } = selection;
          
          // Ensure we are not at the root 'doc' node.
          if ($from.depth === 0) {
            return false;
          }

          node = $from.node($from.depth);
          posToInsert = $from.after($from.depth);
        }

        if (node) {
          const nodeJson = node.toJSON();
          // Insert the JSON representation of the node at the calculated position
          return chain()
            .insertContentAt(posToInsert, nodeJson)
            .run();
        }

        return false;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-d': () => this.editor.commands.duplicateNode(),
    };
  },
});