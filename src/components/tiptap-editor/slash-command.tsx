import { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CommandItem } from './extensions/command-item';

interface SlashCommandMenuProps extends SuggestionProps<CommandItem> {
  // No additional props needed for now
}

export type SlashCommandMenuRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

export const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const keyboardNavigating = useRef(false);
  const keyboardNavTimeout = useRef<NodeJS.Timeout | null>(null);

  const selectItem = (index: number) => {
    if (index >= props.items.length) {
      return;
    }
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useEffect(() => {
    const activeIndex = props.items.findIndex(item => item.isActive?.());
    setSelectedIndex(activeIndex === -1 ? 0 : activeIndex);
  }, [props.items]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const selectedButton = container.querySelector<HTMLButtonElement>(`[data-index="${selectedIndex}"]`);

      if (selectedButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = selectedButton.getBoundingClientRect();

        if (buttonRect.bottom > containerRect.bottom) {
          container.scrollTop += buttonRect.bottom - containerRect.bottom;
        } else if (buttonRect.top < containerRect.top) {
          container.scrollTop -= containerRect.top - buttonRect.top;
        }
      }
    }
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        keyboardNavigating.current = true;
        if (keyboardNavTimeout.current) {
          clearTimeout(keyboardNavTimeout.current);
        }
        keyboardNavTimeout.current = setTimeout(() => {
          keyboardNavigating.current = false;
        }, 200);

        setSelectedIndex(prevIndex => {
          if (event.key === 'ArrowUp') {
            return (prevIndex + props.items.length - 1) % props.items.length;
          }
          return (prevIndex + 1) % props.items.length;
        });
        return true;
      }

      if (event.key === 'Enter') {
        if (keyboardNavTimeout.current) {
          clearTimeout(keyboardNavTimeout.current);
        }
        keyboardNavigating.current = false;
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  // Group commands by their 'group' property
  const groupedCommands: { [key: string]: CommandItem[] } = {};
  props.items.forEach(item => {
    if (!groupedCommands[item.group]) {
      groupedCommands[item.group] = [];
    }
    groupedCommands[item.group].push(item);
  });

  if (props.items.length === 0) {
    return (
      <div className="bg-background border border-border rounded-md shadow-xl p-2.5 w-60 text-sm text-muted-foreground">
        No results found.
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="bg-background border border-border rounded-md shadow-xl p-2 w-60 max-h-80 overflow-y-auto flex flex-col"
    >
      {Object.entries(groupedCommands).map(([group, commands], groupIndex) => (
        <div key={groupIndex} className={groupIndex > 0 ? 'mt-2' : ''}>
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{group.toUpperCase()}</div>
          <div className="flex flex-col gap-0.5 mt-1">
            {commands.map((item, index) => {
              const overallIndex = props.items.indexOf(item);
              const isFocused = overallIndex === selectedIndex;
              const isActive = item.isActive?.() ?? false;
              return (
                <button
                  key={index}
                  data-index={overallIndex}
                  className={`flex items-center w-full text-left px-2 py-1 rounded-sm text-sm ${
                    isFocused
                      ? 'bg-accent text-accent-foreground'
                      : `hover:bg-accent hover:text-accent-foreground ${isActive ? 'bg-accent/50 text-accent-foreground' : ''}`
                  }`}
                  onClick={() => selectItem(overallIndex)}
                  onMouseEnter={() => {
                    if (keyboardNavigating.current) {
                      return;
                    }
                    setSelectedIndex(overallIndex);
                  }}
                >
                  <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="flex-grow">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});

SlashCommandMenu.displayName = 'SlashCommandMenu';
