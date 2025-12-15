
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

interface CommandListProps {
  items: { title: string; command: () => void; icon: React.ElementType }[];
  command: (item: { title: string; command: () => void }) => void;
}

const CommandList = forwardRef((props: CommandListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];

    if (item) {
      props.command(item);
    }
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

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

  return (
    <div className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-stone-200 bg-white px-1 py-2 font-medium text-stone-800 shadow-md transition-all">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            className={`flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm text-stone-900 hover:bg-stone-100 ${index === selectedIndex ? 'bg-stone-100 text-stone-900' : ''}`}
            key={index}
            onClick={() => selectItem(index)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 bg-white">
              <item.icon className="h-6 w-6" />
            </div>
            <span>{item.title}</span>
          </button>
        ))
      ) : (
        <div className="p-2">No results</div>
      )}
    </div>
  );
});

CommandList.displayName = 'CommandList';

export { CommandList };
