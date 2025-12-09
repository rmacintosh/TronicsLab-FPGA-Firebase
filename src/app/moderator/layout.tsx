
import { FC, ReactNode } from 'react';

interface ModeratorLayoutProps {
  children: ReactNode;
}

const ModeratorLayout: FC<ModeratorLayoutProps> = ({ children }) => {
  return <div className="container mx-auto px-4 py-8">{children}</div>;
};

export default ModeratorLayout;
