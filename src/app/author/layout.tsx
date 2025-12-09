
import { FC, ReactNode } from 'react';

interface AuthorLayoutProps {
  children: ReactNode;
}

const AuthorLayout: FC<AuthorLayoutProps> = ({ children }) => {
  return <div className="container mx-auto px-4 py-8">{children}</div>;
};

export default AuthorLayout;
