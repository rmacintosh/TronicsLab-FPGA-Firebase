'use client'

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SidebarInput, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Search } from "lucide-react";
import { useData } from "../providers/data-provider";

export function MainHeader() {
    const { isMobile } = useSidebar();
    const pathname = usePathname();
    const isAdminPage = pathname.startsWith("/admin");
    const { articles, categories } = useData();

    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const nameMap = {
        'articles': 'Articles',
        ...Object.fromEntries(articles.map(a => [a.slug, a.title]))
    };

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-card px-4 sm:px-6">
            <div className="flex items-center gap-4">
                {isMobile && <SidebarTrigger />}
                {!isMobile && !isAdminPage && isClient && <Breadcrumbs articles={articles} categories={categories} nameMap={nameMap} />}
            </div>

            <div className="flex items-center justify-end flex-1 md:grow-0">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <SidebarInput
                        placeholder="Search..."
                        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
                    />
                </div>
            </div>
        </header>
    );
}
