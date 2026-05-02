'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ThemeProvider } from './components/ui/theme-provider';
import { AntDesignThemeSync } from './components/antd-theme-sync';
import I18nProvider from './components/i18n-provider';
import { AppInit } from './components/app-init';
import { NotificationProvider } from './components/notification-provider';

// 创建 QueryClient 实例的函数
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 5分钟内认为数据是新鲜的
        staleTime: 1000 * 60 * 5,
        // 10分钟后缓存会被清理
        gcTime: 1000 * 60 * 10,
        // 窗口焦点时重新获取
        refetchOnWindowFocus: true,
        // 错误时重试次数
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // 服务端渲染时每次都创建新的实例
    return makeQueryClient();
  } else {
    // 客户端浏览器中复用同一个实例
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  // 在组件内部创建 queryClient 实例，而不是作为 prop 传递
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AntdRegistry>
        <I18nProvider>
          <ThemeProvider
            defaultTheme="system"
            storageKey="investment-agent-theme"
            attribute="class"
            enableSystem
            disableTransitionOnChange
          >
            <AntDesignThemeSync>
              <AppInit>
                <NotificationProvider>{children}</NotificationProvider>
              </AppInit>
            </AntDesignThemeSync>
          </ThemeProvider>
        </I18nProvider>
      </AntdRegistry>
    </QueryClientProvider>
  );
}
