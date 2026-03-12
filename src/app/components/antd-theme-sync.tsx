'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { ConfigProvider, theme as antdTheme } from 'antd';

export function AntDesignThemeSync({
  children
}: {
  children: React.ReactNode
}) {
  const { theme, resolvedTheme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        token: {
          // Map to our CSS variables
          // colorPrimary: 'var(--antd-primary-color)',
          colorBgSolid: 'var(--antd-bg-color-solid)',
          // colorBgSpotlight: 'var(--antd-bg-color-spotlight)',
        },
        algorithm: resolvedTheme === 'dark'
          ? antdTheme.darkAlgorithm
          : undefined,
      }}
    >
      {children}
    </ConfigProvider>
  );
}