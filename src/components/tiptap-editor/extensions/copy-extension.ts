import { Extension } from '@tiptap/core';
import { toast } from '@/hooks/use-toast';
import { NodeSelection } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    copyNodeToClipboard: {
      /**
       * Copies the content of the current block node to the clipboard.
       */
      copyNodeToClipboard: () => ReturnType;
    };
  }
}

export const CopyToClipboard = Extension.create({
  name: 'copyToClipboard',

  addCommands() {
    return {
      copyNodeToClipboard: () => ({ state }) => {
        const { selection } = state;
        let node;

        if (selection instanceof NodeSelection) {
          // Handle NodeSelection (e.g., from the drag handle menu)
          node = selection.node;
        } else {
          // Handle TextSelection (e.g., from a keyboard shortcut)
          const { $from } = selection;
          // Find the node at the current selection depth
          node = $from.node($from.depth);
        }

        if (node) {
          const textContent = node.textContent;
          if (textContent) {
            navigator.clipboard.writeText(textContent).then(() => {
              toast({ title: 'Copied to clipboard!' });
            }).catch(err => {
              console.error('Failed to copy: ', err);
              toast({ title: 'Failed to copy', variant: 'destructive' });
            });
          } else {
            toast({ title: 'Nothing to copy', variant: 'destructive' });
          }
          return true;
        }

        return false;
      },
    };
  },
});