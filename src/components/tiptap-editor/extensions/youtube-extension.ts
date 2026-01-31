import { Node, mergeAttributes, RawCommands, InputRule } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtube: {
      setYoutubeVideo: (options: { src: string }) => ReturnType;
    };
  }
}

export const Youtube = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-video]',
        getAttrs: (dom: HTMLElement) => ({
          src: dom.querySelector('iframe')?.getAttribute('src'),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-youtube-video': '' }, ['iframe', mergeAttributes(HTMLAttributes)]];
  },

  addCommands(): Partial<RawCommands> {
    return {
      setYoutubeVideo: (options: { src: string; }) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  addInputRules(): InputRule[] {
    return [
      new InputRule({
        find: /^(https?):\/\/(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%?]{11})/,
        handler: ({ match, commands }) => {
          const src = `https://www.youtube.com/embed/${match[5]}`;
          commands.insertContent({
            type: this.name,
            attrs: { src },
          });
        },
      }),
    ];
  },
});
