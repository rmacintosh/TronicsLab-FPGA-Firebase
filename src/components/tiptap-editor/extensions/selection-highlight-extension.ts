
import { Extension } from '@tiptap/core';
import { Plugin, Selection } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { CellSelection, TableMap } from 'prosemirror-tables';
import { Node as ProsemirrorNode } from 'prosemirror-model';

export const findCell = (selection: Selection): { pos: number; node: ProsemirrorNode } | null => {
  const { $head } = selection;
  for (let d = $head.depth; d > 0; d--) {
    const node = $head.node(d);
    if (node.type.spec.tableRole === 'cell' || node.type.spec.tableRole === 'header_cell') {
      return { pos: $head.before(d), node };
    }
  }
  return null;
};

export const TableSelectionHighlighter = Extension.create({
  name: 'tableSelectionHighlighter',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const ringColor = getComputedStyle(document.documentElement).getPropertyValue('--ring').trim();
            if (!ringColor) return null;

            if (state.selection instanceof CellSelection) {
              document.body.classList.add('cell-selection-active');
              const { $anchorCell, $headCell } = state.selection;
              const table = $anchorCell.node(-1);
              if (table) {
                const map = TableMap.get(table);
                const tableStart = $anchorCell.start(-1);
                const rect = map.rectBetween($anchorCell.pos - tableStart, $headCell.pos - tableStart);

                for (let i = rect.top; i < rect.bottom; i++) {
                  for (let j = rect.left; j < rect.right; j++) {
                    const cellPos = map.map[i * map.width + j];
                    const pos = tableStart + cellPos;
                    const node = table.nodeAt(cellPos);

                    if (node) {
                      const isTop = i === rect.top;
                      const isBottom = i === rect.bottom - 1;
                      const isLeft = j === rect.left;
                      const isRight = j === rect.right - 1;

                      let boxShadow = '';
                      if (isTop) boxShadow += `inset 0px 2px 0px 0px hsl(${ringColor}), `;
                      if (isBottom) boxShadow += `inset 0px -2px 0px 0px hsl(${ringColor}), `;
                      if (isLeft) boxShadow += `inset 2px 0px 0px 0px hsl(${ringColor}), `;
                      if (isRight) boxShadow += `inset -2px 0px 0px 0px hsl(${ringColor}), `;

                      if (boxShadow) {
                        const finalBoxShadow = boxShadow.slice(0, -2);
                        decorations.push(
                          Decoration.node(pos, pos + node.nodeSize, {
                            style: `box-shadow: ${finalBoxShadow}`,
                          })
                        );
                      }
                    }
                  }
                }
              }
            } else {
              document.body.classList.remove('cell-selection-active');
              const cell = findCell(state.selection);
              if (cell) {
                decorations.push(
                  Decoration.node(cell.pos, cell.pos + cell.node.nodeSize, {
                    class: 'ProseMirror-active-cell',
                  })
                );
              }
            }

            if (decorations.length === 0) {
              return null;
            }

            return DecorationSet.create(state.doc, decorations);
          },
          handleDOMEvents: {
            mousedown: (view, event) => {
              document.body.classList.add('editor-is-dragging');

              const handleMouseUp = () => {
                document.body.classList.remove('editor-is-dragging');
                window.removeEventListener('mouseup', handleMouseUp);
              };

              window.addEventListener('mouseup', handleMouseUp);
              return false;
            },
          },
        },
      }),
    ];
  },
});
