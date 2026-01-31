'use client';

import { Editor } from '@tiptap/react';
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreHorizontal, Trash2, ArrowUp, ArrowDown, Rows, AlignLeft, Palette, Eraser, Copy, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MenuItem } from './menu-item';

/**
 * @interface TableRowMenuProps
 * @description Props for the TableRowMenu component.
 * @property {Editor} editor - The Tiptap editor instance.
 * @property {boolean} isRowMenuOpen - Whether the row menu is open.
 * @property {(isOpen: boolean) => void} onRowOpenChange - Callback to change the open state of the row menu.
 * @property {React.CSSProperties} leftButtonStyle - The style for the menu's trigger button.
 * @property {boolean} isRowVisible - Whether the row menu trigger is visible.
 * @property {boolean} isFirstRow - Whether the current row is the first one.
 * @property {boolean} isLastRow - Whether the current row is the last one.
 * @property {boolean} isHeaderRow - Whether the current row is a header row.
 * @property {(direction: 'up' | 'down') => void} moveRow - Function to move the row up or down.
 * @property {(type: 'row') => void} duplicate - Function to duplicate the row.
 * @property {() => void} clearSelectedCellsContents - Function to clear the contents of the selected cells.
 */
interface TableRowMenuProps {
    editor: Editor;
    isRowMenuOpen: boolean;
    onRowOpenChange: (isOpen: boolean) => void;
    leftButtonStyle: React.CSSProperties;
    isRowVisible: boolean;
    isFirstRow: boolean;
    isLastRow: boolean;
    isHeaderRow: boolean;
    moveRow: (direction: 'up' | 'down') => void;
    duplicate: (type: 'row') => void;
    clearSelectedCellsContents: () => void;
}

/**
 * @component TableRowMenu
 * @description A React component that renders the menu for a table row in the Tiptap editor.
 * @param {TableRowMenuProps} props - The component props.
 * @returns {React.ReactElement} - The rendered component.
 */
export const TableRowMenu: React.FC<TableRowMenuProps> = ({
    editor,
    isRowMenuOpen,
    onRowOpenChange,
    leftButtonStyle,
    isRowVisible,
    isFirstRow,
    isLastRow,
    isHeaderRow,
    moveRow,
    duplicate,
    clearSelectedCellsContents,
}) => {
    const buttonAttributes = {
        type: "button",
        contentEditable: "false",
        suppressContentEditableWarning: true,
    } as const;

    /**
     * @function runCommandAndClose
     * @description A higher-order function that takes a command, executes it, and then closes the menu.
     * @param {() => void} command - The command to execute.
     * @returns {() => void} - A function that can be used as an event handler.
     */
    const runCommandAndClose = (command: () => void) => {
        return () => {
            command();
            onRowOpenChange(false);
        };
    };
    
    return (
        <Popover open={isRowMenuOpen} onOpenChange={onRowOpenChange}>
            <PopoverTrigger asChild>
            <button
                {...buttonAttributes}
                className={cn('table-row-col-menu-button', { active: isRowMenuOpen })}
                style={{ ...leftButtonStyle, opacity: isRowVisible ? 1 : 0, pointerEvents: isRowVisible ? 'auto' : 'none', zIndex: 20 }}
            >
                <MoreHorizontal size={16} style={{ transform: 'rotate(90deg)' }} />
            </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1">
                {isFirstRow && <MenuItem icon={<Rows size={16}/>} isActive={isHeaderRow} onClick={runCommandAndClose(() => editor.chain().focus().toggleHeaderRow().run())}>Header row</MenuItem>}
                <MenuItem icon={<ArrowUp size={16}/>} onClick={runCommandAndClose(() => moveRow('up'))} disabled={isFirstRow}>Move row up</MenuItem>
                <MenuItem icon={<ArrowDown size={16}/>} onClick={runCommandAndClose(() => moveRow('down'))} disabled={isLastRow}>Move row down</MenuItem>
                <MenuItem icon={<Rows size={16}/>} onClick={runCommandAndClose(() => editor.chain().focus().addRowBefore().run())}>Insert row above</MenuItem>
                <MenuItem icon={<Rows size={16}/>} onClick={runCommandAndClose(() => editor.chain().focus().addRowAfter().run())}>Insert row below</MenuItem>
                <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                <MenuItem icon={<Palette size={16}/>} disabled>Color <ChevronsRight className="ml-auto h-4 w-4" /></MenuItem>
                <MenuItem icon={<AlignLeft size={16}/>} disabled>Alignment <ChevronsRight className="ml-auto h-4 w-4" /></MenuItem>
                <MenuItem icon={<Eraser size={16}/>} onClick={runCommandAndClose(clearSelectedCellsContents)} isDestructive>Clear row contents</MenuItem>
                <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                <MenuItem icon={<Copy size={16}/>} onClick={runCommandAndClose(() => duplicate('row'))}>Duplicate row</MenuItem>
                <MenuItem icon={<Trash2 size={16}/>} onClick={runCommandAndClose(() => editor.chain().focus().deleteRow().run())} isDestructive>Delete row</MenuItem>
            </PopoverContent>
        </Popover>
    );
};