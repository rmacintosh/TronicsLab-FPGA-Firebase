import { cn } from '@/lib/utils';
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { CommandItem } from './extensions/command-item';

export interface CommandListRef {
  onKeyDown: (props: { event: React.KeyboardEvent }) => boolean;
}

export interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const commandListRef = useRef<HTMLDivElement>(null);

  // Set the initial selected index based on the active command
  useEffect(() => {
    const activeItemIndex = props.items.findIndex(item => item.isActive && item.isActive());
    // If an active item is found, set it. Otherwise, default to the first item.
    setSelectedIndex(activeItemIndex === -1 ? 0 : activeItemIndex);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  // Scroll to selected item as it changes
  useEffect(() => {
    const item = commandListRef.current?.querySelector(`[data-index="${selectedIndex}"]`);

    if (item) {
      // Use a timeout to make sure the DOM is painted and ready before scrolling.
      const timer = setTimeout(() => {
        item.scrollIntoView({
          block: 'nearest',
        });
      }, 50);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: React.KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  // Group items by their 'group' property
  const groupedItems: { [key: string]: CommandItem[] } = {};
  props.items.forEach(item => {
    const group = item.group || 'General';
    if (!groupedItems[group]) {
      groupedItems[group] = [];
    }
    groupedItems[group].push(item);
  });

  const groupNames = Object.keys(groupedItems);

  return (
    <div
      ref={commandListRef}
      className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border bg-card p-1 text-card-foreground shadow-lg"
    >
      {props.items.length > 0 ? (
        groupNames.map((groupName, groupIndex) => (
          <div key={groupName}>
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {groupName}
            </div>
            {
              groupedItems[groupName].map(item => {
              const globalIndex = props.items.findIndex(i => i === item);
              return (
                <button
                  key={globalIndex}
                  data-index={globalIndex}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md p-2 text-left text-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    '[&>svg]:size-4 [&>svg]:shrink-0',
                    {
                      'bg-accent font-medium text-accent-foreground': selectedIndex === globalIndex,
                    }
                  )}
                  onClick={() => selectItem(globalIndex)}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </button>
              );
            })}
            {groupIndex < groupNames.length - 1 && <hr className="my-1 border-border" />} 
          </div>
        ))
      ) : (
        <div className="p-2">No results</div>
      )}
    </div>
  );
});

CommandList.displayName = 'CommandList';

export { CommandList };
