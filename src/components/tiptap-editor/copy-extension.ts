import { Extension } from '@tiptap/core';
import { toast } from '@/hooks/use-toast';

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
        const { $from } = state.selection;
        const node = $from.node(1); // Get the node at depth 1

        if (node) {
          const textContent = node.textContent;
          navigator.clipboard.writeText(textContent).then(() => {
            toast({ title: 'Copied to clipboard!' });
          }).catch(err => {
            console.error('Failed to copy: ', err);
            toast({ title: 'Failed to copy', variant: 'destructive' });
          });
          return true;
        }

        return false;
      },
    };
  },
});
