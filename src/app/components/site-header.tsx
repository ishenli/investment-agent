'use client';

import { Button } from '@renderer/components/ui/button';
import { Separator } from '@renderer/components/ui/separator';
import { SidebarTrigger } from '@renderer/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
// Import the navigation data
import { data } from '@renderer/components/app-sidebar';

export function SiteHeader() {
  const pathname = usePathname();

  const getTitle = useMemo(() => {
    // Check main navigation items
    const mainNavItem = data.navMain.find((item) => item.url === pathname);
    if (mainNavItem) {
      return mainNavItem.title;
    }

    // Check secondary navigation items
    const secondaryNavItem = data.navSecondary.find(
      (item) => item.url === pathname || pathname === '/',
    );
    if (secondaryNavItem) {
      return secondaryNavItem.title === '设置' && pathname === '/'
        ? '账户分析'
        : secondaryNavItem.title;
    }

    // Check documents navigation items
    const documentItem = data.documents.find((item) => item.url === pathname);
    if (documentItem) {
      return documentItem.name;
    }

    // Special case for create-account page
    if (pathname.startsWith('/account/create')) return '新增交易账户';
    if (pathname.startsWith('/account/setting')) return '账户设置';
    if (pathname.startsWith('/asset-market-info')) return '资产市场信息';
    if (pathname.startsWith('/note')) return '投资笔记';
    if (pathname.startsWith('/report')) return '投资报告';

    // Default fallback
    return 'Documents';
  }, [pathname]);

  if (pathname === '/chat') {
    return null;
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-medium">{getTitle}</h1>
        {/* <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button>
        </div> */}
      </div>
    </header>
  );
}
