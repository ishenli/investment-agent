'use client';

import { PropsWithChildren, ReactNode, useEffect, useRef } from 'react';
import { useUserStore } from '@renderer/store/user';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE } from '../const/languages';
import { UserStore } from '@renderer/store/user';
import i18nInstance from '../lib/i18n';

interface I18nProviderProps extends PropsWithChildren {
  readonly children: ReactNode;
}

const I18nProvider = ({ children }: I18nProviderProps) => {
  const { i18n } = useTranslation();
  const language = useUserStore((s: UserStore) => s.preference.language);
  const updatePreference = useUserStore((s: UserStore) => s.updatePreference);
  const isInitialized = useRef(false);

  // 初始化时同步 store 中的语言到 i18n（仅执行一次）
  useEffect(() => {
    if (isInitialized.current) return;
    
    const currentLanguage = language || DEFAULT_LANGUAGE;
    // 只在 store 中有语言设置且与当前 i18n 语言不同时才切换
    if (language && i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
    isInitialized.current = true;
  }, [language, i18n]);

  // 监听 store 语言变化，同步到 i18n
  useEffect(() => {
    // 跳过首次渲染，由上面的 effect 处理
    if (!isInitialized.current) return;
    
    const currentLanguage = language || DEFAULT_LANGUAGE;
    if (i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [language, i18n]);

  // 监听 i18n 语言变化事件，同步到 store
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      // 当 i18n 语言改变时，同步更新到 store
      if (language !== lng) {
        updatePreference({ language: lng as any });
      }
    };

    i18nInstance.on('languageChanged', handleLanguageChange);

    return () => {
      i18nInstance.off('languageChanged', handleLanguageChange);
    };
  }, [language, updatePreference]);

  return children;
};

export default I18nProvider;