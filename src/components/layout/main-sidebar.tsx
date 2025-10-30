'use client'

import { Button } from "@/components/ui/button"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { ArrowLeft, ChevronRight, Home } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { UserNav } from "../user-nav"
import { ThemeToggle } from "../theme-toggle"
import { useData } from "../providers/data-provider"
import { useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"

// Define the structure for our view state
interface ViewState {
  type: 'categories' | 'articles';
  id: string | null;
}

export default function MainSidebar() {
    const pathname = usePathname();
    const { categories, articles } = useData();
    const [currentView, setCurrentView] = useState<ViewState>({ type: 'categories', id: null });
    const { isMobile, openMobile, setOpenMobile } = useSidebar();

    const mainNav = [
        { href: "/", label: "Home", icon: Home },
    ];

    // -- Hierarchical Data Logic --

    // Find the currently selected category
    const currentCategory = categories.find(c => c.id === currentView.id);

    // Determine the parent for the 'Go Back' button
    const parentCategory = categories.find(c => c.id === currentCategory?.parentId);

    // Get the categories to display at the current level
    const displayedCategories = categories.filter(c => c.parentId === currentView.id);

    // Get the articles to display if we're at a leaf category
    const articlesToDisplay = (currentView.type === 'articles' || displayedCategories.length === 0 && currentCategory)
        ? articles.filter(a => a.categoryId === currentView.id)
        : [];

    // -- Handlers --

    const handleCategoryClick = (categoryId: string) => {
        const subCategories = categories.filter(c => c.parentId === categoryId);
        // If there are sub-categories, stay in the 'categories' view, otherwise switch to 'articles'
        const nextViewType = subCategories.length > 0 ? 'categories' : 'articles';
        setCurrentView({ type: nextViewType, id: categoryId });
    };

    const handleGoBack = () => {
        // If there's a parent, go to it, otherwise go to the top level
        setCurrentView({ type: 'categories', id: parentCategory ? parentCategory.id : null });
    };

    const handleGoHome = () => {
        // Reset to the top-level category view
        setCurrentView({ type: 'categories', id: null });
    }

    const closeSheet = () => {
        setOpenMobile(false);
    }

    const SidebarContentComp = () => (
        <>
            <SidebarHeader className="p-4 flex flex-row items-center justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
                <Link href="/" className="flex items-center gap-2" onClick={handleGoHome}>
                    <Button variant="ghost" size="icon" className="shrink-0 text-primary hover:bg-primary/10">
                        <Image src="/logo.svg" alt="TronicsLab Logo" width={24} height={24} className="transition-all duration-300 ease-in-out group-hover:scale-110" />
                    </Button>
                    <h1 className="font-headline text-xl font-semibold group-data-[collapsible=icon]:hidden">TronicsLab</h1>
                </Link>
            </SidebarHeader>
            <SidebarContent className="p-2 pt-0">
                <SidebarMenu>
                    {mainNav.map((item) => (
                        <SidebarMenuItem key={item.href}>
                            <Link href={item.href} className="w-full" onClick={() => { handleGoHome(); closeSheet() }}>
                                <SidebarMenuButton
                                    isActive={pathname === item.href}
                                    tooltip={item.label}
                                    variant="sidebar"
                                >
                                    <item.icon className="size-4"/>
                                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>

                {/* --- Drill-Down Navigation --- */}
                <div className="w-full mt-4 group-data-[collapsible=icon]:hidden">
                    <SidebarMenu>
                        {/* -- Back Button -- */}
                        {currentCategory && (
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={handleGoBack} className="text-muted-foreground font-light text-sm h-8 justify-start">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    <span>Go Back</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}

                        {/* -- Section Header -- */}
                        <h3 className="px-2 mt-2 text-xs font-semibold text-foreground/80 mb-2 truncate">
                            {currentCategory ? currentCategory.name : 'All Categories'}
                        </h3>

                        {/* -- Display Sub-Categories -- */}
                        {displayedCategories.map(category => (
                            <SidebarMenuItem key={category.id}>
                                <SidebarMenuButton onClick={() => handleCategoryClick(category.id)} className="justify-between h-8 font-light text-sm" variant="sidebar">
                                    <span className="truncate">{category.name}</span>
                                    <ChevronRight className="w-4 h-4"/>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}

                        {/* -- Display Articles -- */}
                        {articlesToDisplay.map(article => (
                            <SidebarMenuItem key={article.id}>
                                <Link href={`/articles/${article.slug}`} className="w-full" onClick={closeSheet}>
                                    <SidebarMenuButton isActive={pathname.endsWith(article.slug)} className="h-auto py-1.5 justify-start font-light text-sm h-8" variant="sidebar">
                                        <span className="truncate whitespace-normal leading-normal">{article.title}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </div>
            </SidebarContent>
            <SidebarFooter className="p-2 border-t flex-row items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-4">
                <UserNav />
                <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
                    <ThemeToggle />
                    {!isMobile && <SidebarTrigger />}
                </div>
            </SidebarFooter>
        </>
    )

    if (isMobile) {
        return (
            <Sheet open={openMobile} onOpenChange={setOpenMobile}>
                <SheetContent side="left" className="p-0 flex flex-col w-[18rem]">
                    <SidebarContentComp />
                </SheetContent>
            </Sheet>
        )
    }

    return (
        <Sidebar collapsible="icon" className="hidden sm:flex sm:flex-col w-[18rem]">
            <SidebarContentComp />
        </Sidebar>
    )
}
