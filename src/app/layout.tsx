'use client'

import './globals.css';
import { AppSidebar } from '@renderer/components/app-sidebar';
import { SiteHeader } from '@renderer/components/site-header';
import { SidebarProvider, SidebarInset } from '@renderer/components/ui/sidebar';
import { initAppData } from './lib/app';
import { Providers } from './providers';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import '@ant-design/v5-patch-for-react-19';
import { ScrollArea } from './components/ui/scroll-area';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
// export const metadata: Metadata = {
//   title: 'Investment Inc',
//   description: 'A Personal Investment Management App',
// };

const PageLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {

  const path = usePathname();
  if(path === '/chat') {
    return <>{children}</>;
  }

  return <ScrollArea className="h-[calc(100vh-90px)]">{children}</ScrollArea>;
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    initAppData();
  }, []);
  return (
    <html lang="en">
      <body className={`antialiased`} id="app">
        <AntdRegistry>
          <Providers>
            <SidebarProvider
              // open={true}
              style={
                {
                  '--sidebar-width': 'calc(var(--spacing) * 48)',
                  '--header-height': 'calc(var(--spacing) * 12)',
                } as React.CSSProperties
              }
            >
              <AppSidebar variant="inset" />
              <SidebarInset>
                <SiteHeader />
                <PageLayout>{children}</PageLayout>
              </SidebarInset>
            </SidebarProvider>
          </Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
