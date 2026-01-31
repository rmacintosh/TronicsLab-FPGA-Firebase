import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

interface HoverHighlightState {
  decorations: DecorationSet;
  menuOpen: boolean;
}

export const hoverHighlightPluginKey = new PluginKey<HoverHighlightState>('hoverHighlight');

export const HoverHighlight = Extension.create({
  name: 'hoverHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: hoverHighlightPluginKey,

        state: {
          init(): HoverHighlightState {
            return { decorations: DecorationSet.empty, menuOpen: false };
          },
          apply(tr, oldState): HoverHighlightState {
            const meta = tr.getMeta(hoverHighlightPluginKey);

            if (meta?.menu === 'open') {
              return { ...oldState, menuOpen: true };
            }

            if (meta?.menu === 'close') {
              return { decorations: DecorationSet.empty, menuOpen: false };
            }

            if (meta?.add) {
              const { pos } = meta.add;
              const { doc } = tr;

              if (pos !== null && pos !== undefined && pos < doc.content.size) {
                const $pos = doc.resolve(pos);
                if ($pos.depth > 0) {
                  const from = $pos.before(1); // Position before the top-level node
                  const node = doc.nodeAt(from);
                  if (node) {
                    const to = from + node.nodeSize;
                    const decoration = Decoration.node(from, to, { class: 'hovered-node' });
                    return { ...oldState, decorations: DecorationSet.create(doc, [decoration]) };
                  }
                }
              }
            }

            if (meta?.remove) {
              return { ...oldState, decorations: DecorationSet.empty };
            }

            if (oldState.decorations.find().length > 0 && tr.docChanged) {
              const newDecorations = oldState.decorations.map(tr.mapping, tr.doc);
              return { ...oldState, decorations: newDecorations };
            }

            return oldState;
          },
        },

        props: {
          decorations(state) {
            return hoverHighlightPluginKey.getState(state)?.decorations;
          },
          handleDOMEvents: {
            mouseover: (view, event) => {
              if (view.dom.classList.contains('resize-cursor')) {
                return false;
              }

              const pluginState = hoverHighlightPluginKey.getState(view.state);
              if (pluginState?.menuOpen) {
                return false;
              }

              const posAtCoords = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!posAtCoords) return false;

              const pos = posAtCoords.pos;
              const $pos = view.state.doc.resolve(pos);

              // Walk up the document tree from the hovered position to check for a table.
              for (let i = $pos.depth; i > 0; i--) {
                const node = $pos.node(i);
                if (node.type.name === 'table') {
                  // Mouse is over a table or its content. Ensure no highlight is shown.
                  if (pluginState && pluginState.decorations.find().length > 0) {
                    view.dispatch(view.state.tr.setMeta(hoverHighlightPluginKey, { remove: true }));
                  }
                  return false; // Prevent highlighting.
                }
              }

              // If not in a table, check if we're already highlighting this position.
              if (pluginState?.decorations) {
                const currentDecorations = pluginState.decorations.find();
                if (currentDecorations.length > 0) {
                  const decoratedFrom = currentDecorations[0].from;
                  const decoratedTo = currentDecorations[0].to;
                  if (pos >= decoratedFrom && pos < decoratedTo) {
                    return false; // Already highlighting this node, do nothing.
                  }
                }
              }
              
              // Not in a table and not already highlighted, so add the highlight.
              view.dispatch(view.state.tr.setMeta(hoverHighlightPluginKey, { add: { pos } }));
              
              return false;
            },
            mouseleave: (view, event) => {
              const pluginState = hoverHighlightPluginKey.getState(view.state);
              const relatedTarget = event.relatedTarget as HTMLElement | null;

              if (pluginState?.menuOpen || relatedTarget?.closest('.handle-wrapper')) {
                return false;
              }

              if (pluginState && pluginState.decorations.find().length > 0) {
                view.dispatch(view.state.tr.setMeta(hoverHighlightPluginKey, { remove: true }));
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});
