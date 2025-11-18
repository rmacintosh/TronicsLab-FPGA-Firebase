import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Category } from '@/lib/types';

interface CategoryCardProps {
  category: Category;
}

export const CategoryCard = ({ category }: CategoryCardProps) => {
  return (
    <Link href={`/categories/${category.slug}`}>
        <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
                <CardTitle className="text-xl font-semibold">{category.name}</CardTitle>
            </CardHeader>
        </Card>
    </Link>
  );
};
