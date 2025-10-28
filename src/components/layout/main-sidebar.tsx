
'use client'

import { Button } from "@/components/ui/button"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInput, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar"
import { ArrowLeft, Cpu, Home, Search, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserNav } from "../user-nav"
import { ThemeToggle } from "../theme-toggle"
import { useData } from "../providers/data-provider"
import { useState } from "react"

// Define the structure for our view state
interface ViewState {
  type: 'categories' | 'articles';
  id: string | null;
}

export default function MainSidebar() {
    const pathname = usePathname();
    const { categories, articles } = useData();
    const [currentView, setCurrentView] = useState<ViewState>({ type: 'categories', id: null });

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

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="p-4">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2" onClick={handleGoHome}>
                        <Button variant="ghost" size="icon" className="shrink-0 text-primary hover:bg-primary/10">
                            <Cpu className="size-6" />
                        </Button>
                        <h1 className="font-headline text-xl font-semibold group-data-[collapsible=icon]:hidden">TronicsLab</h1>
                    </Link>
                </div>
                <div className="relative mt-2 group-data-[collapsible=icon]:hidden">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <SidebarInput placeholder="Search..." className="pl-8" />
                </div>
            </SidebarHeader>
            <SidebarContent className="p-4 pt-0">
                <SidebarMenu>
                    <SidebarMenuItem className="group-data-[collapsible=icon]:block hidden">
                        <SidebarMenuButton tooltip="Search">
                            <Search/>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    {mainNav.map((item) => (
                        <SidebarMenuItem key={item.href}>
                             <Link href={item.href} className="w-full" onClick={handleGoHome}>
                                <SidebarMenuButton
                                    isActive={pathname === item.href}
                                    tooltip={item.label}
                                >
                                    <item.icon />
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
                                <SidebarMenuButton onClick={handleGoBack} className="text-muted-foreground">
                                    <ArrowLeft className="w-4 h-4 mr-2"/>
                                    <span>Go Back</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}

                        {/* -- Section Header -- */}
                        <h3 className="px-2 mt-2 text-sm font-semibold text-foreground mb-2 truncate">
                            {currentCategory ? currentCategory.name : 'All Categories'}
                        </h3>

                        {/* -- Display Sub-Categories -- */}
                        {displayedCategories.map(category => (
                            <SidebarMenuItem key={category.id}>
                                <SidebarMenuButton onClick={() => handleCategoryClick(category.id)} className="justify-between">
                                    <span className="truncate">{category.name}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                        
                        {/* -- Display Articles -- */}
                        {articlesToDisplay.map(article => (
                            <SidebarMenuItem key={article.id}>
                                <Link href={`/articles/${article.slug}`} className="w-full">
                                    <SidebarMenuButton isActive={pathname.endsWith(article.slug)} className="h-auto py-1.5">
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
                    <SidebarTrigger />
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
