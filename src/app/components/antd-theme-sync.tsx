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
        // token: {
        //   // Map to our CSS variables
        //   colorPrimary: 'var(--antd-primary-color)',
        //   colorBgContainer: 'var(--antd-bg-color-container)',
        //   colorText: 'var(--antd-text-color)',
        //   colorBorder: 'var(--antd-border-color)',
        //   borderRadius: parseInt('var(--antd-border-radius)', 10),
        // },
        algorithm: resolvedTheme === 'dark'
          ? antdTheme.darkAlgorithm
          : undefined,
      }}
    >
      {children}
    </ConfigProvider>
  );
}