'use client';

import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { FC, useRef, useEffect, useCallback, useState } from 'react';

// Helper to robustly parse width into a number, handling `px` suffixes and other formats.
const parseWidth = (width: string | number | null | undefined): number => {
  if (typeof width === 'number') {
    return width;
  }
  if (typeof width === 'string') {
    return parseInt(width, 10) || 0;
  }
  return 0;
};

const ImageView: FC<any> = ({ editor, node, updateAttributes }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null); // A ref for the <img> element itself
  const [isLoaded, setIsLoaded] = useState(false);

  const numericWidthRef = useRef(parseWidth(node.attrs.width));

  useEffect(() => {
    numericWidthRef.current = parseWidth(node.attrs.width);
  }, [node.attrs.width]);

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (img && numericWidthRef.current === 0 && img.naturalWidth > 0) {
      // Set initial width to natural width, but cap it at 720px
      const initialWidth = Math.min(img.naturalWidth, 720);
      updateAttributes({ width: initialWidth });
    }
    setIsLoaded(true); // Signal that the image and its initial width are set.
  }, [updateAttributes]);

  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      img.addEventListener('load', handleImageLoad);
      if (img.complete) {
        handleImageLoad();
      }
      return () => {
        img.removeEventListener('load', handleImageLoad);
      };
    }
  }, [handleImageLoad]);

  const onResize = useCallback(
    (entries: ResizeObserverEntry[]) => {
      const newWidth = entries[0].borderBoxSize[0].inlineSize;
      if (Math.abs(newWidth - numericWidthRef.current) > 1) {
        requestAnimationFrame(() => {
          updateAttributes({ width: Math.round(newWidth) });
        });
      }
    },
    [updateAttributes]
  );

  useEffect(() => {
    // Only attach the resize observer after the image has loaded.
    if (!isLoaded) return;

    const observer = new ResizeObserver(onResize);
    const wrapper = wrapperRef.current;
    if (wrapper) {
      observer.observe(wrapper);
    }
    return () => {
      if (wrapper) {
        observer.unobserve(wrapper);
      }
    };
  }, [isLoaded, onResize]);

  const currentWidth = parseWidth(node.attrs.width);

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      as="div"
      className={`not-prose relative block ${ // Added not-prose to opt-out of global styles
        editor.isEditable ? 'resize-x overflow-auto border-2 border-dashed border-gray-400' : ''
      }`}
      style={{
        width: currentWidth > 0 ? `${currentWidth}px` : 'auto',
      }}
    >
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt}
        title={node.attrs.title}
        className="w-full h-auto block"
      />
    </NodeViewWrapper>
  );
};

export const CustomImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      height: { default: null },
      width: {
        default: null,
        renderHTML: (attributes: Record<string, any>) => {
          const width = parseWidth(attributes.width);
          if (!width) {
            return {};
          }
          return {
            style: `width: ${width}px`,
          };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});
