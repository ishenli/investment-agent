'use client';

import { useEffect, useRef, useState } from 'react';
import { useUserStore } from '@/app/store/user/store';
import { SupportedLanguage } from '@/types/user';
import { DEFAULT_LANGUAGE } from '@/app/const/languages';
import i18n, { setDayjsLocale } from '@renderer/lib/i18n';
import { useScheduler, TaskCheckResult } from './useScheduler';

interface AppInitState {
  isInitializing: boolean;
  isInitialized: boolean;
  error: Error | null;
}

interface AppInitOptions {
  /** 是否在挂载时自动初始化 */
  autoInit?: boolean;
  /** 初始化完成后的回调 */
  onSuccess?: () => void;
  /** 初始化失败后的回调 */
  onError?: (error: Error) => void;
  /** 是否启用调度器（定时任务检查） */
  enableScheduler?: boolean;
  /** 调度器后台检查间隔（毫秒），默认 1 小时 */
  schedulerCheckIntervalMs?: number;
}

/**
 * 应用初始化 Hook
 *
 * 负责应用启动时的初始化工作：
 * 1. 加载用户偏好设置（语言、主题等）
 * 2. 同步语言设置到 i18n
 * 3. 标记初始化完成状态
 *
 * @example
 * // 在应用根组件中使用
 * function App() {
 *   const { isInitialized, isInitializing } = useAppInitHook();
 *
 *   if (isInitializing) return <Loading />;
 *   if (!isInitialized) return <ErrorPage />;
 *
 *   return <MainContent />;
 * }
 */
export function useAppInitHook(options: AppInitOptions = {}) {
  const {
    autoInit = true,
    onSuccess,
    onError,
    enableScheduler = true,
    schedulerCheckIntervalMs = 60 * 60 * 1000, // 1 小时
  } = options;

  const [state, setState] = useState<AppInitState>({
    isInitializing: false,
    isInitialized: false,
    error: null,
  });

  const hasInitRef = useRef(false);
  const preference = useUserStore((s) => s.preference);
  const isUserStateInit = useUserStore((s) => s.isUserStateInit);

  // 使用 useScheduler 处理调度器逻辑
  const {
    isExecuting: isSchedulerExecuting,
    lastCheckResult: schedulerResult,
    error: schedulerError,
    checkAndRun,
  } = useScheduler({
    runOnMount: false, // 由初始化逻辑控制启动时机
    enableBackgroundCheck: enableScheduler && state.isInitialized,
    checkIntervalMs: schedulerCheckIntervalMs,
  });

  const initialize = async () => {
    // 防止重复初始化
    if (hasInitRef.current) return;
    hasInitRef.current = true;

    setState((prev) => ({ ...prev, isInitializing: true, error: null }));

    try {
      // 1. 调用 initUserState 完成用户状态初始化
      // 这会从 localStorage 加载偏好设置，从 SQLite 加载头像，并设置 isUserStateInit = true
      const { initUserState } = useUserStore.getState();
      await initUserState();

      // 2. 获取 store 中更新后的状态
      const { preference, updatePreference } = useUserStore.getState();

      // 3. 确定最终语言设置（优先级：store > i18n > 默认）
      const finalLanguage: SupportedLanguage =
        preference.language ||
        (typeof window !== 'undefined' && (window.__INITIAL_LANGUAGE__ as SupportedLanguage)) ||
        DEFAULT_LANGUAGE;

      // 4. 如果语言与当前 store 不一致，更新它
      if (finalLanguage !== preference.language) {
        await updatePreference({ language: finalLanguage });
      }

      setState({
        isInitializing: false,
        isInitialized: true,
        error: null,
      });

      onSuccess?.();
    } catch (error) {
      const initError = error instanceof Error ? error : new Error('初始化失败');

      setState({
        isInitializing: false,
        isInitialized: false,
        error: initError,
      });

      onError?.(initError);
    }
  };

  useEffect(() => {
    if (autoInit && !hasInitRef.current) {
      // 使用 setTimeout 避免同步调用 setState 导致的级联渲染
      const timer = setTimeout(() => {
        initialize();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoInit]);

  // 监听 store 中的语言变化，同步到 i18n 和 dayjs
  useEffect(() => {
    const currentLanguage = preference.language || DEFAULT_LANGUAGE;
    if (currentLanguage && i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
      setDayjsLocale(currentLanguage);
    }
  }, [preference.language]);

  // 初始化完成后启动调度器（首次执行）
  const hasSchedulerRun = useRef(false);
  useEffect(() => {
    if (enableScheduler && state.isInitialized && !hasSchedulerRun.current) {
      hasSchedulerRun.current = true;
      checkAndRun();
    }
  }, [enableScheduler, state.isInitialized, checkAndRun]);

  // 开发环境下输出调度器日志
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && schedulerResult) {
      console.log('[useAppInit] Scheduler check result:', schedulerResult);
    }
  }, [schedulerResult]);

  return {
    ...state,
    initialize,
    // 便捷属性：是否准备好渲染应用
    isReady: state.isInitialized && isUserStateInit,
    // 调度器状态
    scheduler: {
      isExecuting: isSchedulerExecuting,
      result: schedulerResult,
      error: schedulerError,
    },
  };
}

/**
 * 应用初始化守卫 Hook
 *
 * 简化版：只返回初始化状态，不暴露控制方法
 * 适合在页面组件中快速使用
 *
 * @example
 * function Page() {
 *   const { isReady, isInitializing } = useAppInitGuard();
 *
 *   if (!isReady) return <SplashScreen />;
 *   return <PageContent />;
 * }
 */
export function useAppInitGuard() {
  return useAppInitHook({ autoInit: true });
}
