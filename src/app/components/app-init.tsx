'use client';

import { ReactNode } from 'react';
import { useAppInitHook } from '@/app/hooks/useApp';
import { Loader2 } from 'lucide-react';

interface AppInitProps {
  children: ReactNode;
  /** 自定义加载组件 */
  loadingComponent?: ReactNode;
  /** 初始化失败时显示的内容 */
  errorComponent?: ReactNode;
  /** 初始化成功回调 */
  onInitSuccess?: () => void;
  /** 初始化失败回调 */
  onInitError?: (error: Error) => void;
}

/**
 * 应用初始化包装组件
 *
 * 在应用启动时执行初始化逻辑，显示加载状态，完成后渲染子组件
 *
 * @example
 * // 在 layout.tsx 中使用
 * <Providers>
 *   <AppInit>
 *     {children}
 *   </AppInit>
 * </Providers>
 */
export function AppInit({
  children,
  loadingComponent,
  errorComponent,
  onInitSuccess,
  onInitError,
}: AppInitProps) {
  const { isReady, isInitializing, error } = useAppInitHook({
    autoInit: true,
    onSuccess: onInitSuccess,
    onError: onInitError,
  });

  // 显示加载状态
  if (isInitializing) {
    return (
      <>
        {loadingComponent || (
          <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">initializing...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <>
        {errorComponent || (
          <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="text-destructive">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">initial error</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {error.message}
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                reload
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // 未准备好时显示加载状态
  if (!isReady) {
    return (
      <>
        {loadingComponent || (
          <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">initializing...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // 初始化完成，渲染子组件
  return <>{children}</>;
}
