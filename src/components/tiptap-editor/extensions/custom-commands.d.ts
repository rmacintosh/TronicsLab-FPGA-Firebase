import { Editor } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtube: {
      /**
       * Adds a YouTube video
       */
      setYoutubeVideo: (options: { src: string }) => ReturnType;
    };
  }
}
