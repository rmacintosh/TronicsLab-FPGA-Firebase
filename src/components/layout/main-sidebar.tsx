
'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInput, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from "@/components/ui/sidebar"
import { BookOpen, Cpu, Home, Newspaper, Search, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserNav } from "../user-nav"
import { ThemeToggle } from "../theme-toggle"
import { useData } from "../providers/data-provider"

export default function MainSidebar() {
    const pathname = usePathname();
    const { categories, subCategories, articles, isAdmin } = useData();

    const mainNav = [
        { href: "/", label: "Home", icon: Home },
        { href: "/tutorials", label: "Tutorials", icon: BookOpen },
        { href: "/blog", label: "Blog", icon: Newspaper },
    ];

    const getArticlesForSubCategory = (categorySlug: string, subCategoryName: string) => {
        return articles.filter(a => a.category === categorySlug && a.subCategory === subCategoryName);
    }
    
    const getSubcategoriesForCategory = (categorySlug: string) => {
        return subCategories.filter(sc => sc.parentCategory === categorySlug);
    }
    
    return (
        <Sidebar>
            <SidebarHeader className="p-4">
                <Link href="/" className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="shrink-0 text-primary hover:bg-primary/10">
                        <Cpu className="size-6" />
                    </Button>
                    <h1 className="font-headline text-xl font-semibold">TronicsLab</h1>
                </Link>
                <div className="relative mt-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <SidebarInput placeholder="Search..." className="pl-8" />
                </div>
            </SidebarHeader>
            <SidebarContent className="p-4 pt-0">
                <SidebarMenu>
                    {mainNav.map((item) => (
                        <SidebarMenuItem key={item.href}>
                             <Link href={item.href} className="w-full">
                                <SidebarMenuButton
                                    isActive={pathname === item.href}
                                    tooltip={item.label}
                                >
                                    <item.icon />
                                    <span>{item.label}</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>

                <Accordion type="multiple" defaultValue={['tutorials', 'blog']} className="w-full mt-4">
                    {categories.map((category) => (
                        <AccordionItem value={category.slug} key={category.id}>
                            <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:no-underline hover:text-foreground p-2 rounded-md hover:bg-accent/50">
                                {category.name}
                            </AccordionTrigger>
                            <AccordionContent>
                                {getSubcategoriesForCategory(category.slug).length > 0 && (
                                    <SidebarMenuSub>
                                        {getSubcategoriesForCategory(category.slug).map(sub => (
                                            <Accordion type="single" collapsible key={sub.id}>
                                                <AccordionItem value={sub.slug}>
                                                     <AccordionTrigger className="text-xs font-medium text-muted-foreground hover:no-underline hover:text-foreground p-2 rounded-md">
                                                        {sub.name}
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <SidebarMenuSub>
                                                            {getArticlesForSubCategory(category.slug, sub.name).map(article => (
                                                                <SidebarMenuSubItem key={article.id}>
                                                                    <SidebarMenuSubButton asChild isActive={pathname.endsWith(article.slug)}>
                                                                        <Link href={`/articles/${article.slug}`}>
                                                                            {article.title}
                                                                        </Link>
                                                                    </SidebarMenuSubButton>
                                                                </SidebarMenuSubItem>
                                                            ))}
                                                        </SidebarMenuSub>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        ))}
                                    </SidebarMenuSub>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>

                {isAdmin && (
                    <div className="mt-auto pt-4">
                        <h3 className="px-2 text-xs font-medium text-muted-foreground mb-2">Admin</h3>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <Link href="/admin" className="w-full">
                                    <SidebarMenuButton isActive={pathname.startsWith('/admin')} tooltip="Admin Settings">
                                        <Settings />
                                        <span>Admin Panel</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </div>
                )}
            </SidebarContent>
            <SidebarFooter className="p-2 border-t flex-row items-center justify-between">
                <UserNav />
                <ThemeToggle />
            </SidebarFooter>
        </Sidebar>
    )
}

    