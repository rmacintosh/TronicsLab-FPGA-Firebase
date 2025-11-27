'use client';

import React, { useRef, useState } from 'react';
import { useDrag, useDrop, DropTargetMonitor } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { GripVertical, Pencil, Trash2, Check, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { CategoryItemProps, DragItem, HierarchicalCategory, ItemTypes } from './types';
import { flattenHierarchy } from './utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import DynamicIcon from '@/components/icons/dynamic-icon';

// Calculates the height of a tree/subtree. A single node has height 1.
const getTreeHeight = (category: HierarchicalCategory): number => {
    if (!category.children || category.children.length === 0) {
        return 1;
    }
    const childHeights = category.children.map(getTreeHeight);
    return 1 + Math.max(0, ...childHeights); // Use Math.max(0, ...) to handle empty arrays
};

export const CategoryItem: React.FC<CategoryItemProps> = ({ category, settings, moveCategory, findCategory, onUpdate, onDelete, onStartEdit, onCancelEdit, editingCategory, setEditingCategory }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [dropIndicator, setDropIndicator] = useState<'top' | 'bottom' | 'nest' | null>(null);

    const [{ isDragging }, drag] = useDrag(() => ({
      type: ItemTypes.CATEGORY,
      item: { id: category.id, parentId: category.parentId, originalIndex: findCategory(category.id).index, category },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      end: (item, monitor) => {
        setDropIndicator(null);
        const didDrop = monitor.didDrop();
        if (!didDrop) {
            const { category: originalCategory, index } = findCategory(item.id);
            moveCategory(item.id, index, originalCategory.parentId);
        }
    },
    }), [category, moveCategory, findCategory]);

    const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>(
      () => ({
        accept: ItemTypes.CATEGORY,
        canDrop: (item, monitor) => {
            if (item.id === category.id) return false;

            // Prevent dropping a category onto one of its own descendants
            const descendants = flattenHierarchy(item.category.children);
            if (descendants.some(c => c.id === category.id)) return false;

            return true;
        },
        hover(item: DragItem, monitor: DropTargetMonitor) {
          if (!ref.current || !monitor.canDrop()) {
            setDropIndicator(null);
            return;
          }

          const hoverBoundingRect = ref.current.getBoundingClientRect();
          const clientOffset = monitor.getClientOffset();
          if (!clientOffset) return;

          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          // Determine if drop is at top, bottom, or middle (for nesting)
          if (hoverClientY < hoverBoundingRect.height / 3) {
            setDropIndicator('top');
          } else if (hoverClientY > hoverBoundingRect.height * 2/3) {
            setDropIndicator('bottom');
          } else {
            // Final depth is the target's level + the height of the dragged tree.
            // A dragged item becomes level (target.level + 1). Its deepest child is (height - 1) levels below that.
            // Total depth = (target.level + 1) + (height - 1) = target.level + height
            const draggedTreeHeight = getTreeHeight(item.category);
            const resultingDepth = category.level + draggedTreeHeight;

            // maxDepth is 1-indexed, resultingDepth is effectively 1-indexed count of levels from the root
            // Defensively cast maxDepth to a Number to prevent type-related comparison errors.
            if (resultingDepth < Number(settings.maxDepth)) {
                setDropIndicator('nest');
            } else {
                setDropIndicator(null);
            }
          }
        },
        drop: (item: DragItem) => {
            if (!dropIndicator) return;
            if (dropIndicator === 'nest') {
                moveCategory(item.id, 0, category.id);
            } else {
                const { index: overIndex } = findCategory(category.id);
                const newIndex = dropIndicator === 'top' ? overIndex : overIndex + 1;
                moveCategory(item.id, newIndex, category.parentId);
            }
            setDropIndicator(null);
        },
        leave: () => {
            setDropIndicator(null);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }),
            canDrop: monitor.canDrop(),
        }),
      }),
      [findCategory, moveCategory, category, dropIndicator, settings],
    )

    const isEditing = editingCategory && editingCategory.id === category.id;

    drag(drop(ref));

    return (
      <div style={{ paddingLeft: `${category.level * 24}px`, position: 'relative' }} className="my-1">
          {isOver && canDrop && dropIndicator === 'top' && <div style={{ position: 'absolute', top: 0, left: `${category.level * 24}px`, right: 0, height: '2px', backgroundColor: '#3b82f6', zIndex: 10 }} />}
          <div 
            ref={ref} 
            className={cn(
                "flex items-center justify-between p-2 group rounded-md",
                "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700",
                "transition-colors duration-150",
                {
                    'opacity-50': isDragging,
                    'shadow-lg': isDragging,
                    'border-2 border-dashed border-blue-500': isOver && canDrop && dropIndicator === 'nest',
                    'border-2 border-dashed border-transparent': !(isOver && canDrop && dropIndicator === 'nest')
                }
            )}
          >
            <div className="flex items-center flex-grow min-w-0"> {/* Ensure flex-grow has a baseline width */} 
                <div className="cursor-move p-2">
                    <GripVertical size={16} className="text-gray-400"/>
                </div>
                {isEditing ? (
                    <Input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="flex-grow mr-2 h-8"
                        autoFocus
                    />
                ) : (
                    <div className="flex items-center ml-2">
                        {category.icon && <DynamicIcon name={category.icon} className="mr-2 h-4 w-4 text-gray-500" />}
                        <span className="truncate">{category.name}</span>
                    </div>
                )}
            </div>
              <div className="flex items-center">
                  {isEditing ? (
                      <>
                          <Input
                              type="text"
                              value={editingCategory.slug}
                              onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                              className="flex-grow mr-2 h-8"
                          />
                          <Button onClick={() => onUpdate(editingCategory)} variant='ghost' size='icon' className="mr-1"><Check size={16} /></Button>
                          <Button onClick={onCancelEdit} variant='ghost' size='icon'><X size={16} /></Button>
                      </>
                  ) : (
                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-2 mr-4">
                            <Badge variant="secondary">Lvl: {category.level + 1}</Badge>
                            <Badge variant="outline">Articles: {category.articleCount}</Badge>
                        </div>
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button onClick={() => onStartEdit(category)} variant='outline' size='icon'><Pencil size={16} /></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size='icon'><Trash2 size={16} /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the <strong>{category.name}</strong> category and move all its articles and sub-categories to the top-level 'Uncategorized' category.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onDelete(category.id)}>Continue</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      </div>
                  )}
              </div>
          </div>
          {isOver && canDrop && dropIndicator === 'bottom' && <div style={{ position: 'absolute', bottom: 0, left: `${category.level * 24}px`, right: 0, height: '2px', backgroundColor: '#3b82f6', zIndex: 10 }} />}
          {category.children && category.children.map((child: HierarchicalCategory) => (
              <CategoryItem
                  key={child.id}
                  category={child}
                  settings={settings}
                  moveCategory={moveCategory}
                  findCategory={findCategory}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                  editingCategory={editingCategory}
                  setEditingCategory={setEditingCategory}
              />
          ))}
      </div>
    );
  };
