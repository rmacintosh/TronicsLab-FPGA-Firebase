"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";

type BreadcrumbProps = {
  nameMap?: Record<string, string>;
  basePath?: string;
  rootName?: string;
  rootHref?: string;
};

export function Breadcrumbs({ 
  nameMap = {}, 
  basePath = "", 
  rootName = "Home", 
  rootHref 
}: BreadcrumbProps) {
  const pathname = usePathname();
  const relativePathname = pathname.startsWith(basePath) ? pathname.substring(basePath.length) : pathname;
  const segments = relativePathname.split('/').filter(Boolean);

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const finalRootHref = rootHref || basePath || "/";

  return (
    <nav className="flex items-center text-sm font-medium text-muted-foreground">
      {segments.length === 0 ? (
        <span className="font-semibold text-foreground">{rootName}</span>
      ) : (
        <Link href={finalRootHref} className="hover:text-foreground transition-colors">
          {rootName}
        </Link>
      )}

      {segments.map((segment, index) => {
        const href = `${basePath}/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const displayName = nameMap[segment] || segment.replace(/-/g, ' ').split(' ').map(capitalize).join(' ');

        return (
          <Fragment key={href}>
            <ChevronRight className="h-4 w-4 mx-1" />
            {isLast ? (
              <span className="font-semibold text-foreground">{displayName}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {displayName}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}