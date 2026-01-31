import { RawCommands } from '@tiptap/core';

declare module '@tiptap/core' {
  interface RawCommands {
    moveToLastCell: () => boolean;
  }
}
