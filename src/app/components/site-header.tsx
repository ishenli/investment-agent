'use client';

import { Separator } from '@renderer/components/ui/separator';
import { SidebarTrigger } from '@renderer/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
// Import the navigation data
import { data } from '@renderer/components/app-sidebar';
import { useTranslation } from 'react-i18next';

/**
 * Renders the site header and displays a title derived from the current route.
 *
 * The header includes the sidebar trigger, a separator, and the computed title for the active pathname.
 *
 * @returns A header element containing navigation controls and the route-specific title, or `null` when the current route is `/chat`.
 */
export function SiteHeader() {
  const { t } = useTranslation(['components', 'common']);
  const pathname = usePathname();

  const getTitle = useMemo(() => {
    // Check main navigation items
    const mainNavItem = data.navMain.find((item) => item.url === pathname);
    if (mainNavItem) {
      return t(mainNavItem.title as any);
    }

    // Check secondary navigation items
    const secondaryNavItem = data.settings.find(
      (item) => item.url === pathname || pathname === '/',
    );
    if (secondaryNavItem) {
      return secondaryNavItem.name === t('components:sidebar.settings.settings') && pathname === '/'
        ? t('common:header.accountAnalysis')
        : t(secondaryNavItem.name as any);
    }

    // Check documents navigation items
    const documentItem = data.documents.find((item) => item.url === pathname);
    if (documentItem) {
      return t(documentItem.name as any);
    }

    // Special case for create-account page
    if (pathname.startsWith('/account/create')) return t('common:header.createTradingAccount');
    if (pathname.startsWith('/account/setting')) return t('common:header.accountSetting');
    if (pathname.startsWith('/asset-market-info')) return t('common:header.assetMarketInfo');
    if (pathname.startsWith('/asset-meta')) return t('common:header.assetMarketInfo');
    if (pathname.startsWith('/note')) return t('common:header.investmentNotes');
    if (pathname.startsWith('/report')) return t('common:header.investmentReport');
    if (pathname.startsWith('/setting')) return t('common:header.systemSetting');

    // Default fallback
    return t('common:header.documents');
  }, [pathname, t]);

  if (pathname === '/chat') {
    return null;
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-medium w-full" style={{
          // @ts-expect-error - WebkitAppRegion is not a standard CSS property
          WebkitAppRegion: 'drag',
          appRegion: 'drag',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}>{getTitle}</h1>
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