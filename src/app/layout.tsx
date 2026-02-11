'use client';

import './globals.css';
import { initAppData } from './lib/app';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import '@ant-design/v5-patch-for-react-19';
import { useEffect } from 'react';
import { Providers } from './providers';

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
            {children}
          </Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
