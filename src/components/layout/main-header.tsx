"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"

export function MainHeader() {
    const isMobile = useIsMobile();
    return (
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-card px-4 sm:px-6">
            {isMobile && <SidebarTrigger />}
            {/* Breadcrumb can be added here */}
            <div className="flex-1">
                {/* Maybe a page title or search bar */}
            </div>
        </header>
    )
}
