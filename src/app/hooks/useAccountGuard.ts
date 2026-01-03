'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAccountStore } from '@renderer/store/account/store';

/**
 * 路由白名单 - 不需要账户的路由
 */
const WHITELIST_ROUTES = [
  '/account/create',
];

/**
 * 需要账户的路由前缀
 */
const PROTECTED_ROUTE_PREFIXES = [
  '/asset',
  '/chat',
  '/note',
  '/insight',
];

/**
 * 检查路由是否在白名单中
 */
const isWhitelistRoute = (pathname: string): boolean => {
  return WHITELIST_ROUTES.some(route => pathname === route || pathname.startsWith(route));
};

/**
 * 检查路由是否需要账户
 */
const isProtectedRoute = (pathname: string): boolean => {
  return PROTECTED_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
};

/**
 * 账户守卫 Hook
 * 用于保护需要账户的页面，当用户没有账户时重定向到创建页面
 */
export function useAccountGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { accounts, account, fetchAccounts, fetchSelectedAccount, setAccount, loading } = useAccountStore();

  useEffect(() => {
    const checkAccount = async () => {
      // 如果当前路由是白名单路由，不需要检查
      if (isWhitelistRoute(pathname)) {
        return;
      }

      // 如果当前路由不需要账户，不需要检查
      if (!isProtectedRoute(pathname)) {
        return;
      }

      // 缓存当前路径，避免在已跳转到 /account/create 时重复检查
      const hasRedirected = sessionStorage.getItem('accountGuardRedirect');
      if (hasRedirected === 'true' && pathname === '/account/create') {
        return;
      }

      try {
        await fetchAccounts();

        // 如果没有账户，重定向到创建页面
        if (accounts.length === 0) {
          sessionStorage.setItem('accountGuardRedirect', 'true');
          router.push('/account/create');
          return;
        }

        // 如果有账户但未设置选中账户，自动选择第一个
        if (!account) {
          await fetchSelectedAccount();
          const currentAccount = useAccountStore.getState().account;

          if (!currentAccount && accounts.length > 0) {
            // 自动选择第一个账户
            await setAccount(accounts[0]);
          }
        }
      } catch (error) {
        console.error('Failed to check account status:', error);
        // 检查失败时，仍允许访问基础页面
        if (!isWhitelistRoute(pathname) && accounts.length === 0) {
          router.push('/account/create');
        }
      }
    };

    checkAccount();
  }, []);
}