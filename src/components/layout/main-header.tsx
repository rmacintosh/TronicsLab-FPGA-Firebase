"use client"

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function MainHeader() {
    const isMobile = useIsMobile();
    const pathname = usePathname();
    const isAdminPage = pathname.startsWith("/admin");

    // State to track if the component has mounted on the client
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // This effect runs only on the client, after the initial render
        setIsClient(true);
    }, []);

    return (
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-card px-4 sm:px-6">
            {isMobile && <SidebarTrigger />}
            
            {/* Only render the breadcrumbs on the client to avoid hydration mismatch */}
            {isClient && !isAdminPage && <Breadcrumbs />}
            
            <div className="flex-1">
                {/* Maybe a page title or search bar */}
            </div>
        </header>
    );
}
