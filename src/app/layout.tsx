'use client';

import './globals.css';
import { initAppData } from './lib/app';
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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
