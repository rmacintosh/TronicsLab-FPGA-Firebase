import React from 'react';
import { LucideProps, icons, HelpCircle } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

const DynamicIcon: React.FC<DynamicIconProps> = ({ name, ...props }) => {
  const IconComponent = (icons as Record<string, React.FC<LucideProps>>)[name];

  if (!IconComponent) {
    // If the icon name is invalid, fall back to a default HelpCircle icon
    return <HelpCircle {...props} />;
  }

  return <IconComponent {...props} />;
};

export default DynamicIcon;
