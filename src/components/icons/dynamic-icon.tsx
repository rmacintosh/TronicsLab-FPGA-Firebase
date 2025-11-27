'use client';

import { icons, LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const LucideIcon = icons[name as keyof typeof icons];

  if (!LucideIcon) {
    return null; // Or return a default icon if you have one
  }

  return <LucideIcon {...props} />;
};

export default DynamicIcon;
