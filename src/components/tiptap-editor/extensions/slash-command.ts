import { Editor, Extension, Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { Suggestion, SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance, hideAll } from 'tippy.js';

import {
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code, Text,
  ImageIcon, Youtube, ListTodo, Table as TableIcon, Minus as SeparatorIcon,
  Smile, File, Github,
} from 'lucide-react';
import { SlashCommandMenu, SlashCommandMenuRef } from '../slash-command';
import { CommandItem } from './command-item';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export type SlashCommandOptions = Omit<SuggestionOptions, 'editor'>;

const CommandItems = (editor: Editor): CommandItem[] => [
  {
    title: 'Heading 1',
    command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run(); },
    icon: Heading1,
    can: () => editor.can().toggleHeading({ level: 1 }),
    isActive: () => editor.isActive('heading', { level: 1 }),
    group: 'Style',
  },
  {
    title: 'Heading 2',
    command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(); },
    icon: Heading2,
    can: () => editor.can().toggleHeading({ level: 2 }),
    isActive: () => editor.isActive('heading', { level: 2 }),
    group: 'Style',
  },
  {
    title: 'Heading 3',
    command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run(); },
    icon: Heading3,
    can: () => editor.can().toggleHeading({ level: 3 }),
    isActive: () => editor.isActive('heading', { level: 3 }),
    group: 'Style',
  },
  {
    title: 'Bulleted List',
    command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).toggleBulletList().run(); },
    icon: List,
    can: () => editor.can().toggleBulletList(),
    isActive: () => editor.isActive('bulletList'),
    group: 'Style',
  },
  {
    title: 'Numbered List',
    command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).toggleOrderedList().run(); },
    icon: ListOrdered,
    can: () => editor.can().toggleOrderedList(),
    isActive: () => editor.isActive('orderedList'),
    group: 'Style',
  },
  {
    title: 'To-do List',
    command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).toggleTaskList().run(); },
    icon: ListTodo,
    can: () => editor.can().toggleTaskList(),
    isActive: () => editor.isActive('taskList'),
    group: 'Style',
  },
  {
    title: 'Blockquote',
    command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).toggleBlockquote().run(); },
    icon: Quote,
    can: () => editor.can().toggleBlockquote(),
    isActive: () => editor.isActive('blockquote'),
    group: 'Style',
  },
  {
    title: 'Code Block',
    command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).toggleCodeBlock().run(); },
    icon: Code,
    can: () => editor.can().toggleCodeBlock(),
    isActive: () => editor.isActive('codeBlock'),
    group: 'Style',
  },
  {
    title: 'Text',
    command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setParagraph().run(); },
    icon: Text,
    can: () => true,
    isActive: () => editor.isActive('paragraph'),
    group: 'Style',
  },
  {
    title: 'Table',
    command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run(); },
    icon: TableIcon,
    can: () => editor.can().insertTable(),
    group: 'Insert',
  },
  {
    title: 'Separator',
    command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setHorizontalRule().run(); },
    icon: SeparatorIcon,
    can: () => editor.can().setHorizontalRule(),
    group: 'Insert',
  },
  {
    title: 'Emoji',
    command: ({ editor, range }) => {
      const emoji = window.prompt('Enter Emoji');
      if (emoji) editor.chain().focus().deleteRange(range).insertContent(emoji).run();
    },
    icon: Smile,
    can: () => editor.can().insertContent(''),
    group: 'Insert',
  },
  {
    title: 'File',
    command: () => { window.alert('File command triggered - implementation needed'); },
    icon: File,
    can: () => true,
    group: 'Insert',
  },
  {
    title: 'GitHub',
    command: () => { window.alert('GitHub command triggered - implementation needed'); },
    icon: Github,
    can: () => true,
    group: 'Insert',
  },
  {
    title: 'Image',
    command: ({ editor, range }) => {
      const url = window.prompt('URL');
      if (url) editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
    },
    icon: ImageIcon,
    can: () => editor.can().setImage({ src: '' }),
    group: 'Upload',
  },
  {
    title: 'YouTube',
    command: ({ editor, range }) => {
      const url = window.prompt('Enter YouTube URL');
      if (url) editor.chain().focus().deleteRange(range).setYoutubeVideo({ src: url }).run();
    },
    icon: Youtube,
    can: () => editor.can().setYoutubeVideo({ src: '' }),
    group: 'Upload',
  },
];

const slashCommandSuggestion: SlashCommandOptions = {
  char: '/',
  command: ({ editor, range, props }: { editor: Editor; range: Range; props: CommandItem }) => {
    hideAll();
    setTimeout(() => {
      props.command({ editor, range });
    }, 50);
  },
  items: ({ query, editor }: { query: string; editor: Editor; }) => {
    return CommandItems(editor)
      .filter(item => item.can())
      .filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()));
  },
  render: () => {
    let component: ReactRenderer<SlashCommandMenuRef> | null = null;
    let popup: TippyInstance[] | null = null;
    let lastClientRect: DOMRect | null = null;

    return {
      onStart: (props: SuggestionProps<CommandItem>) => {
        component = new ReactRenderer(SlashCommandMenu, {
          props,
          editor: props.editor,
        });

        const getReferenceClientRect = () => {
          const rect = props.clientRect ? props.clientRect() : null;
          if (rect) {
            lastClientRect = rect;
          }
          return rect || lastClientRect || new DOMRect(0, 0, 0, 0);
        };

        popup = tippy('body', {
          getReferenceClientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },
      onUpdate(props: SuggestionProps<CommandItem>) {
        if (!component || !popup || !popup[0]) {
          return;
        }

        component.updateProps(props);

        const getReferenceClientRect = () => {
          const rect = props.clientRect ? props.clientRect() : null;
          if (rect) {
            lastClientRect = rect;
          }
          return rect || lastClientRect || new DOMRect(0, 0, 0, 0);
        };

        popup[0].setProps({
          getReferenceClientRect,
        });
      },
      onKeyDown(props: SuggestionKeyDownProps) {
        if (!component || !popup || !popup[0]) {
          return false;
        }

        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }

        return component.ref?.onKeyDown(props) ?? false;
      },
      onExit() {
        // Intentionally left blank to be handled by the hideSlashCommandOnClick plugin
      },
    };
  },
};

const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      ...slashCommandSuggestion,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options,
      }),
      new Plugin({
        key: new PluginKey('hideSlashCommandOnClick'),
        props: {
          handleClick() {
            hideAll();
            return false;
          },
        },
      }),
    ];
  },
});

export default SlashCommand;
