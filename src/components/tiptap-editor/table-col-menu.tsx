import { Editor } from '@tiptap/react';
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreHorizontal, Trash2, ArrowLeft, ArrowRight, Columns, AlignLeft, Palette, SortAsc, SortDesc, Eraser, Copy, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MenuItem } from './menu-item';

/**
 * @interface TableColMenuProps
 * @description Props for the TableColMenu component.
 * @property {Editor} editor - The Tiptap editor instance.
 * @property {boolean} isColMenuOpen - Whether the column menu is open.
 * @property {(isOpen: boolean) => void} onColOpenChange - Callback to change the open state of the column menu.
 * @property {React.CSSProperties} topButtonStyle - The style for the menu's trigger button.
 * @property {boolean} isColVisible - Whether the column menu trigger is visible.
 * @property {boolean} isFirstCol - Whether the current column is the first one.
 * @property {boolean} isLastCol - Whether the current column is the last one.
 * @property {boolean} isHeaderCol - Whether the current column is a header column.
 * @property {(direction: 'left' | 'right') => void} moveColumn - Function to move the column left or right.
 * @property {(type: 'column') => void} duplicate - Function to duplicate the column.
 * @property {() => void} clearSelectedCellsContents - Function to clear the contents of the selected cells.
 * @property {(order: 'asc' | 'desc') => void} sortColumn - Function to sort the column.
 * @property {boolean} canSort - Whether the column can be sorted.
 */
interface TableColMenuProps {
    editor: Editor;
    isColMenuOpen: boolean;
    onColOpenChange: (isOpen: boolean) => void;
    topButtonStyle: React.CSSProperties;
    isColVisible: boolean;
    isFirstCol: boolean;
    isLastCol: boolean;
    isHeaderCol: boolean;
    moveColumn: (direction: 'left' | 'right') => void;
    duplicate: (type: 'column') => void;
    clearSelectedCellsContents: () => void;
    sortColumn: (order: 'asc' | 'desc') => void;
    canSort: boolean;
}

/**
 * @component TableColMenu
 * @description A React component that renders the menu for a table column in the Tiptap editor.
 * @param {TableColMenuProps} props - The component props.
 * @returns {React.ReactElement} - The rendered component.
 */
export const TableColMenu: React.FC<TableColMenuProps> = ({
    editor,
    isColMenuOpen,
    onColOpenChange,
    topButtonStyle,
    isColVisible,
    isFirstCol,
    isLastCol,
    isHeaderCol,
    moveColumn,
    duplicate,
    clearSelectedCellsContents,
    sortColumn,
    canSort,
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
            onColOpenChange(false);
        };
    };
    
    return (
        <Popover open={isColMenuOpen} onOpenChange={onColOpenChange}>
            <PopoverTrigger asChild>
            <button
                {...buttonAttributes}
                className={cn("table-row-col-menu-button", { active: isColMenuOpen })}
                style={{ ...topButtonStyle, opacity: isColVisible ? 1 : 0, pointerEvents: isColVisible ? 'auto' : 'none', zIndex: 20 }}
            >
                <MoreHorizontal size={16} />
            </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1">
                {isFirstCol && <MenuItem icon={<Columns size={16}/>} isActive={isHeaderCol} onClick={runCommandAndClose(() => editor.chain().focus().toggleHeaderColumn().run())}>Header column</MenuItem>}
                <MenuItem icon={<ArrowLeft size={16}/>} onClick={runCommandAndClose(() => moveColumn('left'))} disabled={isFirstCol}>Move column left</MenuItem>
                <MenuItem icon={<ArrowRight size={16}/>} onClick={runCommandAndClose(() => moveColumn('right'))} disabled={isLastCol}>Move column right</MenuItem>
                <MenuItem icon={<Columns size={16}/>} onClick={runCommandAndClose(() => editor.chain().focus().addColumnBefore().run())}>Insert column left</MenuItem>
                <MenuItem icon={<Columns size={16}/>} onClick={runCommandAndClose(() => editor.chain().focus().addColumnAfter().run())}>Insert column right</MenuItem>
                <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                <MenuItem icon={<SortAsc size={16}/>} onClick={runCommandAndClose(() => sortColumn('asc'))} disabled={!canSort}>Sort column A-Z</MenuItem>
                <MenuItem icon={<SortDesc size={16}/>} onClick={runCommandAndClose(() => sortColumn('desc'))} disabled={!canSort}>Sort column Z-A</MenuItem>
                <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                <MenuItem icon={<Palette size={16}/>} disabled>Color <ChevronsRight className="ml-auto h-4 w-4" /></MenuItem>
                <MenuItem icon={<AlignLeft size={16}/>} disabled>Alignment <ChevronsRight className="ml-auto h-4 w-4" /></MenuItem>
                <MenuItem icon={<Eraser size={16}/>} onClick={runCommandAndClose(clearSelectedCellsContents)} isDestructive>Clear column contents</MenuItem>
                <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                <MenuItem icon={<Copy size={16}/>} onClick={runCommandAndClose(() => duplicate('column'))}>Duplicate column</MenuItem>
                <MenuItem icon={<Trash2 size={16}/>} onClick={runCommandAndClose(() => editor.chain().focus().deleteColumn().run())} isDestructive>Delete column</MenuItem>
            </PopoverContent>
        </Popover>
    );
};