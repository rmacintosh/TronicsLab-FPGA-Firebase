
'use client';

import { EditorContent } from '@tiptap/react';
import { useTiptapEditor } from '@/hooks/use-tiptap-editor';
import { DragHandle as CustomDragHandle } from './drag-handle';
import { EditorBubbleMenu } from './bubble-menu';
import { EditorCharacterCount } from './editor-character-count';
import { useEffect, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { hoverHighlightPluginKey } from './extensions/hover-highlight-extension';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableQuickAddMenu } from './table-quick-add-menu';
import TableRowColMenu from './table-row-col-menu';
import CellMenu from './cell-menu';
import { CellSelection } from 'prosemirror-tables';
import { Transaction } from 'prosemirror-state';
import { findCell } from './extensions/selection-highlight-extension';

const TiptapEditor = ({
  content,
  onChange,
  articleId,
}: {
  content: string;
  onChange: (richText: string) => void;
  articleId: string;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCellMenuOpen, setIsCellMenuOpen] = useState(false);
  const [distractionFree, setDistractionFree] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const { editor } = useTiptapEditor({ content, onChange, articleId });

  const handleMenuOpenChange = (isOpen: boolean) => {
    setMenuOpen(isOpen);
    if (editor) {
      const transaction = isOpen
        ? editor.view.state.tr.setMeta(hoverHighlightPluginKey, { menu: 'open' })
        : editor.view.state.tr.setMeta(hoverHighlightPluginKey, { menu: 'close' });
      editor.view.dispatch(transaction);
    }
  };

  useEffect(() => {
    if (distractionFree) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [distractionFree]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleTransaction = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged && !transaction.selectionSet) {
        return;
      }

      const { selection } = editor.state;
      const editorDom = editorRef.current;

      if (!editorDom) {
        setTimeout(() => flushSync(() => setMenuPosition(null)), 0);
        return;
      }

      let rect: DOMRect | null = null;

      if (selection instanceof CellSelection) {
        const { $anchorCell, $headCell } = selection;
        const anchorCellNode = editor.view.nodeDOM($anchorCell.pos) as HTMLElement | null;
        const headCellNode = editor.view.nodeDOM($headCell.pos) as HTMLElement | null;
        if (anchorCellNode && headCellNode) {
          const anchorRect = anchorCellNode.getBoundingClientRect();
          const headRect = headCellNode.getBoundingClientRect();
          rect = new DOMRect(
            Math.min(anchorRect.left, headRect.left),
            Math.min(anchorRect.top, headRect.top),
            Math.max(anchorRect.right, headRect.right) - Math.min(anchorRect.left, headRect.left),
            Math.max(anchorRect.bottom, headRect.bottom) - Math.min(anchorRect.top, headRect.top)
          );
        }
      } else {
        const cell = findCell(selection);
        if (cell) {
          const cellNode = editor.view.nodeDOM(cell.pos) as HTMLElement | null;
          if (cellNode) {
            rect = cellNode.getBoundingClientRect();
          }
        }
      }

      if (rect) {
        const editorRect = editorDom.getBoundingClientRect();
        const newPosition = {
          top: rect.top - editorRect.top + rect.height / 2,
          left: rect.right - editorRect.left,
        };
        setTimeout(() => flushSync(() => setMenuPosition(newPosition)), 0);
      } else {
        setTimeout(() => flushSync(() => setMenuPosition(null)), 0);
      }
    };

    editor.on('transaction', handleTransaction);

    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor]);

  return (
    <div
      ref={editorRef}
      className={cn(
        'relative w-full',
        !distractionFree
          ? 'rounded-md border bg-background border ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'
          : 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm'
      )}
    >
      {editor && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={cn('absolute z-10 h-8 w-8 p-2', {
              'top-2 right-2': !distractionFree,
              'top-4 right-4': distractionFree,
            })}
            onClick={() => setDistractionFree(!distractionFree)}
            title={distractionFree ? 'Show editor UI' : 'Distraction-free mode'}
          >
            {distractionFree ? <Eye size={16} /> : <EyeOff size={16} />}
          </Button>

          <div className={cn(distractionFree && 'hidden')}>
            <CustomDragHandle editor={editor} menuOpen={menuOpen} onOpenChange={handleMenuOpenChange} />
            <EditorBubbleMenu editor={editor} shouldShow={() => !(editor.state.selection instanceof CellSelection)} />
            <TableQuickAddMenu editor={editor} isCellMenuOpen={isCellMenuOpen} />
            <TableRowColMenu editor={editor} editorRef={editorRef} />
          </div>

          {menuPosition && (
            <div
              style={{
                position: 'absolute',
                top: menuPosition.top,
                left: menuPosition.left,
                zIndex: 30,
                transform: 'translate(-50%, -66%)',
              }}
            >
              <CellMenu editor={editor} isOpen={isCellMenuOpen} onOpenChange={setIsCellMenuOpen} />
            </div>
          )}
        </>
      )}

      <div
        className={cn({
          'h-full overflow-y-auto': distractionFree,
        })}
      >
        <div
          className={cn(
            'prose dark:prose-invert prose-headings:font-display font-default focus:outline-none max-w-full',
            {
              'mx-auto max-w-3xl py-16': distractionFree,
            }
          )}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {editor && (
        <div className={cn(distractionFree && 'hidden')}>
          <EditorCharacterCount editor={editor} />
        </div>
      )}
    </div>
  );
};

export default TiptapEditor;
