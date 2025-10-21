import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar";
import MainSidebar from "@/components/layout/main-sidebar";
import { MainContent } from "@/components/layout/main-content";
import { DataProvider } from "@/components/providers/data-provider";
import { FirebaseClientProvider } from "@/firebase";

export const metadata: Metadata = {
  title: "TronicsLab: FPGA",
  description: "Tutorials, blog posts and code snippets related to electronics and FPGA development.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Space+Grotesk:wght@300..700&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("font-body antialiased", "min-h-screen bg-background")}>
        <ThemeProvider defaultTheme="system">
          <FirebaseClientProvider>
            <DataProvider>
              <SidebarProvider>
                <MainSidebar />
                <MainContent>
                  {children}
                </MainContent>
                <Toaster />
              </SidebarProvider>
            </DataProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
