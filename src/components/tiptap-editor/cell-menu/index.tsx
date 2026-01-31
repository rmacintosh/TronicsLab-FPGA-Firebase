'use client';

import { Editor } from '@tiptap/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Palette, AlignLeft, Trash2, ChevronRight, Combine } from 'lucide-react';
import React, { useMemo } from 'react';
import { CellSelection } from 'prosemirror-tables';
import { findCell } from '../extensions/selection-highlight-extension';
import { TextSelection } from 'prosemirror-state';
import { SubMenu } from './submenu';
import AlignmentSubMenu from './alignment-submenu';
import ColorSubMenu from './color-submenu';

interface CellMenuProps {
  editor: Editor;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface MenuItemProps {
    icon: React.ReactNode;
    text: string;
    hasSubMenu?: boolean;
    onClick?: () => void;
    isDestructive?: boolean;
}

const FourDotsIcon = () => (
    <div className="grid grid-cols-2 gap-0.5 p-0.5">
        <div className="w-1 h-1 bg-current rounded-full" />
        <div className="w-1 h-1 bg-current rounded-full" />
        <div className="w-1 h-1 bg-current rounded-full" />
        <div className="w-1 h-1 bg-current rounded-full" />
    </div>
);

const MenuItem: React.FC<MenuItemProps> = ({ icon, text, hasSubMenu = false, onClick, isDestructive = false }) => (
    <Button
        variant="ghost"
        className={`w-full justify-between p-1 h-8 ${isDestructive ? 'text-red-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50' : ''}`}
        onClick={onClick}
    >
        <div className="flex items-center">
            {icon}
            <span>{text}</span>
        </div>
        {hasSubMenu && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </Button>
)

const CellMenu: React.FC<CellMenuProps> = ({ editor, isOpen, onOpenChange }) => {

    const hasContent = useMemo(() => {
        const isCellTrulyEmpty = (content: string) => {
            const trimmed = content.trim();
            return trimmed.length === 0 || trimmed === '\u200B';
        }

        if (!editor || !editor.state) return false;
        const { selection } = editor.state;
        
        if (selection instanceof CellSelection) {
            const cells: any[] = [];
            selection.forEachCell(cellNode => cells.push(cellNode));
            return cells.some(cellNode => !isCellTrulyEmpty(cellNode.textContent));
        } else {
            const cell = findCell(selection);
            if (cell) {
                return !isCellTrulyEmpty(cell.node.textContent);
            }
        }
        return false;
    }, [editor, editor.state.selection]);

    const clearContents = () => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        let tr = state.tr;
    
        const createEmptyParagraph = () => {
            return state.schema.nodes.paragraph.create(null, state.schema.text('\u200B'));
        }
    
        if (selection instanceof CellSelection) {
            const cells: {pos: number, node: any}[] = [];
            selection.forEachCell((node, pos) => {
                cells.push({node, pos});
            });
    
            for (let i = cells.length - 1; i >= 0; i--) {
                const { pos, node } = cells[i];
                tr.setNodeMarkup(pos, node.type, { ...node.attrs, backgroundColor: null });
                const from = pos + 1;
                const to = from + node.content.size;
                tr.replaceWith(from, to, createEmptyParagraph());
            }
        } else {
            const cell = findCell(selection);
            if (cell) {
                tr.setNodeMarkup(cell.pos, cell.node.type, { ...cell.node.attrs, backgroundColor: null });
                const from = cell.pos + 1;
                const to = from + cell.node.content.size;
                tr.replaceWith(from, to, createEmptyParagraph());
            }
        }
    
        if (tr.docChanged) {
            if (selection instanceof CellSelection) {
                const $anchor = tr.doc.resolve(tr.mapping.map(selection.$anchorCell.pos));
                const $head = tr.doc.resolve(tr.mapping.map(selection.$headCell.pos));
                const newSelection = new CellSelection($anchor, $head);
                tr.setSelection(newSelection);
            } else {
                const cell = findCell(selection);
                if (cell) {
                    const mappedCellPos = tr.mapping.map(cell.pos);
                    const finalCursorPos = mappedCellPos + 2; 
                    const newSelection = TextSelection.create(tr.doc, finalCursorPos);
                    tr.setSelection(newSelection);
                }
            }
            dispatch(tr);
        }
        onOpenChange(false);
    };

    const canMerge = editor.can().mergeCells();
    const canSplit = editor.can().splitCell();

    return (
        <Popover open={isOpen} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <button className="bg-background rounded-full p-0.5 border border-border shadow-md hover:ring-2 hover:ring-ring">
                <FourDotsIcon />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" side="bottom" align="start">
                <div className="flex flex-col">
                    <SubMenu trigger={
                        <MenuItem
                            icon={<Palette className="w-4 h-4 mr-2" />} 
                            text="Color"
                            hasSubMenu
                        />
                    }>
                        <ColorSubMenu editor={editor} />
                    </SubMenu>
                    <SubMenu trigger={
                        <MenuItem
                            icon={<AlignLeft className="w-4 h-4 mr-2" />} 
                            text="Alignment"
                            hasSubMenu
                        />
                    }>
                        <AlignmentSubMenu editor={editor} />
                    </SubMenu>
                    
                    {(canMerge || canSplit) && (
                        <>
                            <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                            <MenuItem
                                icon={<Combine className="w-4 h-4 mr-2" />}
                                text={canMerge ? "Merge cells" : "Split cell"}
                                onClick={() => editor.chain().focus().mergeOrSplit().run()}
                            />
                        </>
                    )}

                    {hasContent && (
                        <MenuItem
                        icon={<Trash2 className="w-4 h-4 mr-2" />}
                        text="Clear Contents"
                        onClick={clearContents}
                        isDestructive
                        />
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default CellMenu;
