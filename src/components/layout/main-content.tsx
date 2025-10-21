import { ReactNode } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { MainHeader } from "@/components/layout/main-header";

export function MainContent({ children }: { children: ReactNode }) {
  return (
    <SidebarInset>
      <MainHeader />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
        {children}
      </div>
    </SidebarInset>
  );
}
