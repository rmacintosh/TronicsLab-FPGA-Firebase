
import { Category } from '@/lib/server-types';

export interface HierarchicalCategory extends Category {
  children: HierarchicalCategory[];
  level: number;
  articleCount: number;
}

export interface CategorySettings {
    maxDepth: number;
}

export const ItemTypes = { CATEGORY: 'category' };

export interface DragItem {
    id: string;
    originalIndex: number;
    parentId: string | null;
    category: HierarchicalCategory;
}

export interface CategoryItemProps {
    category: HierarchicalCategory;
    settings: CategorySettings;
    moveCategory: (id: string, atIndex: number, newParentId: string | null) => void;
    findCategory: (id: string) => { category: HierarchicalCategory; index: number };
    onUpdate: (category: { id: string; name: string; slug: string; }) => void;
    onDelete: (id: string) => void;
    onStartEdit: (category: Category) => void;
    onCancelEdit: () => void;
    editingCategory: { id: string; name: string; slug: string; } | null;
    setEditingCategory: React.Dispatch<React.SetStateAction<{ id: string; name: string; slug: string; } | null>>;
}
