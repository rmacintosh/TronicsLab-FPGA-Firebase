import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { CellSelection } from 'prosemirror-tables';
import { findCell } from '../extensions/selection-highlight-extension';

interface ColorSubMenuProps {
  editor: Editor;
}

const colorOptions = [
  { name: 'Default', color: '' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Purple', color: '#8b5cf6' },
  { name: 'Pink', color: '#ec4899' },
];

const ColorSubMenu: React.FC<ColorSubMenuProps> = ({ editor }) => {

  const applyTextColor = (color: string) => {
    const { state, dispatch } = editor.view;
    let { tr } = state;
    const { selection } = state;

    if (selection instanceof CellSelection) {
      const isCellEmpty = (node: any) => {
        if (!node.content.childCount) return true;
        if (node.content.childCount > 1) return false;
        const firstChild = node.content.firstChild;
        if (firstChild.type.name !== 'paragraph') return false;
        return firstChild.content.size === 0;
      };

      const cells: {pos: number, node: any}[] = [];
      selection.forEachCell((node, pos) => {
          cells.push({node, pos});
      });
      
      const mark = color ? editor.schema.marks.textStyle.create({ color }) : null;

      for (let i = cells.length - 1; i >= 0; i--) {
          const { pos, node } = cells[i];
          const from = pos + 1;
          const to = from + node.content.size;

          if (isCellEmpty(node)) {
              if (mark) {
                  const p = state.schema.nodes.paragraph.create(null, state.schema.text('\u200B', [mark]));
                  tr.replaceWith(from, to, p);
              }
          } else {
              if (mark) {
                  tr.addMark(from, to, mark);
              } else {
                  const textStyleMarkType = editor.schema.marks.textStyle;
                  tr.removeMark(from, to, textStyleMarkType);
              }
          }
      }

      if (tr.docChanged) {
          dispatch(tr);
      }
      return;
    }

    if (selection.empty && !(selection instanceof CellSelection)) {
        const cell = findCell(selection);
        if (cell) {
            const from = cell.pos + 1;
            const to = from + cell.node.content.size;

            const command = editor.chain().focus();
            command.setTextSelection({ from, to });
            if (color) {
                command.setColor(color);
            } else {
                command.unsetColor();
            }
            command.setTextSelection(selection.anchor);
            command.run();
            return;
        }
    }
    
    const command = color ? editor.chain().focus().setColor(color) : editor.chain().focus().unsetColor();
    command.run();
  };

  const applyBackgroundColor = (color: string) => {
    editor.chain().focus().setCellAttribute('backgroundColor', color || null).run();
  };

  return (
    <div className="p-2">
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">Text Color</p>
        <div className="grid grid-cols-4 gap-1">
          {colorOptions.map(option => (
            <Button
              key={`text-${option.name}`}
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 border"
              onClick={() => applyTextColor(option.color)}
              title={option.name}
            >
              <div style={{ backgroundColor: option.color || 'transparent' }} className="h-full w-full rounded-sm border border-border"></div>
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-2">
        <p className="text-xs font-semibold text-muted-foreground mb-1">Background Color</p>
        <div className="grid grid-cols-4 gap-1">
          {colorOptions.map(option => (
            <Button
              key={`bg-${option.name}`}
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 border"
              onClick={() => applyBackgroundColor(option.color)}
              title={option.name}
            >
              <div style={{ backgroundColor: option.color || 'transparent' }} className="h-full w-full rounded-sm border border-border"></div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorSubMenu;
