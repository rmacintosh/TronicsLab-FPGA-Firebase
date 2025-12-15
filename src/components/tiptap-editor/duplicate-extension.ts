import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    duplicateNode: {
      /**
       * Duplicates the current node.
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
        const { $from } = state.selection;
        
        // Get the node at the current selection depth
        const node = $from.node($from.depth);

        if (node) {
          const nodeJson = node.toJSON();
          // Insert the JSON representation of the node after the current node
          return chain()
            .insertContentAt($from.after($from.depth), nodeJson)
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
