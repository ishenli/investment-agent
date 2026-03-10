'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAccountStore } from '@renderer/store/account/store';

/**
 * 路由白名单 - 不需要账户的路由
 */
const WHITELIST_ROUTES = ['/account/create'];

/**
 * 需要账户的路由前缀
 */
const PROTECTED_ROUTE_PREFIXES = ['/asset', '/chat', '/note', '/insight'];

/**
 * 检查路由是否在白名单中
 */
const isWhitelistRoute = (pathname: string): boolean => {
  return WHITELIST_ROUTES.some((route) => pathname === route || pathname.startsWith(route));
};

/**
 * 检查路由是否需要账户
 */
const isProtectedRoute = (pathname: string): boolean => {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
};

/**
 * 账户守卫 Hook
 * 用于保护需要账户的页面，当用户没有账户时重定向到创建页面
 *
 * 优化点：
 * - 防重入逻辑已下沉到 store.initializeAccount，和 AppSidebar 共享锁
 * - 依赖 pathname 确保路由变化时重新验证
 * - 使用 isChecking ref 防止同一组件快速路由切换时的竞态
 */
export function useAccountGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // 如果当前路由是白名单路由，不需要检查
    if (isWhitelistRoute(pathname)) {
      return;
    }

    // 如果当前路由不需要账户保护，跳过
    if (!isProtectedRoute(pathname)) {
      return;
    }

    // 防止同一组件并发执行（快速路由切换场景）
    if (isCheckingRef.current) {
      return;
    }

    let cancelled = false;

    const checkAccount = async () => {
      isCheckingRef.current = true;

      try {
        // 防重入已在 store.initializeAccount 内部处理，直接调用即可
        await useAccountStore.getState().initializeAccount();

        // effect 已被清理（路由再次变化），不执行跳转
        if (cancelled) return;

        const { accounts } = useAccountStore.getState();
        if (accounts.length === 0) {
          router.push('/account/create');
        }
      } catch (error) {
        console.error('Failed to check account status:', error);
        if (!cancelled) {
          const { accounts } = useAccountStore.getState();
          if (accounts.length === 0) {
            router.push('/account/create');
          }
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkAccount();

    return () => {
      // 标记为已取消，防止 unmount 后执行跳转
      cancelled = true;
      isCheckingRef.current = false;
    };
  }, [pathname, router]);
}
