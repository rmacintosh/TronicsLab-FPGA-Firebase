import { Editor, Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import {
  Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, Quote, Code, Text, Image as ImageIcon, Youtube
} from 'lucide-react';
import { CommandList } from './command-list';

// Command configuration
const Command = {
  create: ({ editor, range }: { editor: Editor; range: Range }) => [
    {
      title: 'Heading 1',
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      icon: Heading1,
      can: () => editor.can().toggleHeading({ level: 1 }),
    },
    {
      title: 'Heading 2',
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      icon: Heading2,
      can: () => editor.can().toggleHeading({ level: 2 }),
    },
    {
        title: 'Heading 3',
        command: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        icon: Heading3,
        can: () => editor.can().toggleHeading({ level: 3 }),
    },
    {
      title: 'Paragraph',
      command: () => editor.chain().focus().setParagraph().run(),
      icon: Pilcrow,
      can: () => editor.can().setParagraph(),
    },
    {
      title: 'Bulleted List',
      command: () => editor.chain().focus().toggleBulletList().run(),
      icon: List,
      can: () => editor.can().toggleBulletList(),
    },
    {
      title: 'Numbered List',
      command: () => editor.chain().focus().toggleOrderedList().run(),
      icon: ListOrdered,
      can: () => editor.can().toggleOrderedList(),
    },
    {
      title: 'Blockquote',
      command: () => editor.chain().focus().toggleBlockquote().run(),
      icon: Quote,
      can: () => editor.can().toggleBlockquote(),
    },
    {
      title: 'Code Block',
      command: () => editor.chain().focus().toggleCodeBlock().run(),
      icon: Code,
      can: () => editor.can().toggleCodeBlock(),
    },
    {
        title: 'Image',
        command: () => {
            const url = window.prompt('URL');
            if (url) {
                editor.chain().focus().setImage({ src: url }).run();
            }
        },
        icon: ImageIcon,
        can: () => editor.can().setImage({ src: '' }),
    },
    {
      title: 'YouTube',
      command: () => {
        const url = window.prompt('Enter YouTube URL');
        if (url) {
          editor.commands.setYoutubeVideo({ src: url });
        }
      },
      icon: Youtube,
      can: () => editor.can().setYoutubeVideo({ src: '' }),
    },
  ],
};


// Suggestion plugin configuration
const suggestion = {
  char: '/',
  command: ({ editor, range, props }: { editor: Editor, range: Range, props: any }) => {
    // First, delete the slash command text
    editor.chain().focus().deleteRange(range).run();
    // Then, run the command for the selected item
    props.command();
  },
  // items will be filtered by query and whether the command can be executed
  items: ({ query, editor }: { query: string; editor: Editor }) => {
    const commands = Command.create({ editor, range: {} as Range });
    return commands
      .filter(item => item.can()) // Check if the command can be executed
      .filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()));
  },

  render: () => {
    let component: any;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(CommandList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
            return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) {
            return;
        }

        if (!popup) {
            return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          if (popup) {
            popup[0].hide();
          }
          return true;
        }
        if (!component.ref) {
            return false;
        }
        return component.ref.onKeyDown(props);
      },

      onExit() {
        if (popup) {
            popup[0].destroy();
        }
        if (component) {
            component.destroy();
        }
      },
    };
  },
};

export { suggestion };
