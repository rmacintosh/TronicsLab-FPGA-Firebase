import CodeBlock from '@tiptap/extension-code-block';

export const CustomCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: null,
        parseHTML: element => {
          const codeEl = element.querySelector('code');
          if (!codeEl) {
            return null;
          }
          const language = codeEl.className.match(/language-([\w-]+)/)?.[1];
          return language || null;
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'pre',
      HTMLAttributes,
      [
        'code',
        {
          class: node.attrs.language
            ? `language-${node.attrs.language}`
            : '',
        },
        0,
      ],
    ];
  },
});
