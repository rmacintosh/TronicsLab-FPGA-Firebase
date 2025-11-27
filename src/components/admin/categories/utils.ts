
import { Category } from '@/lib/server-types';
import { HierarchicalCategory } from './types';

export const buildHierarchy = (items: Category[], articleCounts: { [categoryId: string]: number }, parentId: string | null = null, level = 0): HierarchicalCategory[] => {
    return items
        .filter(item => item.parentId === parentId)
        .map(item => ({
            ...item,
            level,
            articleCount: articleCounts[item.id] || 0,
            children: buildHierarchy(items, articleCounts, item.id, level + 1)
        }));
};

export const flattenHierarchy = (hierarchy: HierarchicalCategory[]): HierarchicalCategory[] => {
    const flat: HierarchicalCategory[] = [];
    hierarchy.forEach(cat => {
        const { children, ...rest } = cat;
        flat.push(rest as HierarchicalCategory);
        if (children && children.length > 0) {
            flat.push(...flattenHierarchy(children));
        }
    });
    return flat;
};

export const findCategory = (categories: HierarchicalCategory[], id: string): { category: HierarchicalCategory; index: number } => {
    const flat = flattenHierarchy(categories);
    const category = flat.find(c => c.id === id);
    if (!category) throw new Error('Category not found');
    return {
        category,
        index: flat.indexOf(category),
    };
};
