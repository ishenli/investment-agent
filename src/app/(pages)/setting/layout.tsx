'use client';

import * as React from 'react';
import { SidebarProvider, SidebarInset } from '@renderer/components/ui/sidebar';
import { SettingsSidebar, type SettingsCategory } from '@/app/(pages)/setting/settings-sidebar';
import { usePathname, useRouter } from 'next/navigation';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Extract the current setting category from the path
  const currentCategory = (pathname.split('/').pop() as SettingsCategory) || 'provider';

  const handleCategoryChange = (category: SettingsCategory) => {
    router.push(`/setting/${category}`);
  };

  return (
    <SidebarProvider defaultOpen={true} className='min-h-[calc(100vh-90px)]'>
      <div className="flex w-full">
        {/* Settings Sidebar */}
        <aside className="w-50 border-r border-border/40 bg-background shrink-0">
          <div className="p-2">
            <SettingsSidebar
              activeCategory={currentCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <SidebarInset className="flex-1">
          <div className="flex h-full flex-col">
            {/* Header */}
            {/* <header className="flex h-16 items-center gap-4 border-b border-border/40 px-6">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">{getCategoryTitle(currentCategory)}</h2>
              </div>
            </header> */}

            {/* Content */}
            <main className="overflow-auto p-6 w-full">{children}</main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
