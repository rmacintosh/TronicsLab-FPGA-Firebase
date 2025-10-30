import { ReactNode } from "react";

export function MainContent({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      {children}
    </main>
  );
}
