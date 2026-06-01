import 'dayjs/locale/es';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs'
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '@/app/const/languages';

// 全局类型声明（与 layout.tsx 中一致）
declare global {
  interface Window {
    __INITIAL_LANGUAGE__: string;
  }
}

// 从统一配置导出
export type { SupportedLanguage };
export const supportedLanguages = Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[];
export const defaultLanguage = DEFAULT_LANGUAGE;
export const defaultNS = 'common';

// Namespaces used in the app
export const namespaces = [
  'common',
  'chat',
  'tool',
  'setting',
  'plugin',
  'topic',
  'portal',
  'components',
  'search',
  'note',
  'market',
  'report',
  'transaction',
  'asset',
  'insight',
  'research',
  'snapshot',
  'asset-meta',
  'account',
  'asset-market-info',
  'asset-market-info-fetcher',
  'asset-management',
  'notification',
  'settingNotification',
  'task',
  'scheduled-job',
  'asset-trend',
] as const;

const dayjsLocaleMap: Record<string, string> = {
  'zh-CN': 'zh-cn',
  'en-US': 'en',
  'es-ES': 'es',
}

export const setDayjsLocale = (language: string) => {
  const dayjsLocale = dayjsLocaleMap[language] || 'en'
  dayjs.locale(dayjsLocale)
}

export type AppNamespace = (typeof namespaces)[number];

// Import translations statically for SSR compatibility
import zhCNCommon from '@/locales/zh-CN/common.json';
import zhCNChat from '@/locales/zh-CN/chat.json';
import zhCNTool from '@/locales/zh-CN/tool.json';
import zhCNSetting from '@/locales/zh-CN/setting.json';
import zhCNSettingNotification from '@/locales/zh-CN/setting.notification.json';
import zhCNPlugin from '@/locales/zh-CN/plugin.json';
import zhCNTopic from '@/locales/zh-CN/topic.json';
import zhCNPortal from '@/locales/zh-CN/portal.json';
import zhCNComponents from '@/locales/zh-CN/components.json';
import zhCNSearch from '@/locales/zh-CN/search.json';
import zhCNNote from '@/locales/zh-CN/note.json';
import zhCNMarket from '@/locales/zh-CN/market.json';
import zhCNReport from '@/locales/zh-CN/report.json';
import zhCNTransaction from '@/locales/zh-CN/transaction.json';
import zhCNAsset from '@/locales/zh-CN/asset.json';
import zhCNInsight from '@/locales/zh-CN/insight.json';
import zhCNResearch from '@/locales/zh-CN/research.json';
import zhCNSnapshot from '@/locales/zh-CN/snapshot.json';
import zhCNAssetMeta from '@/locales/zh-CN/asset-meta.json';
import zhCNAccount from '@/locales/zh-CN/account.json';
import zhCNAssetMarketInfo from '@/locales/zh-CN/asset-market-info.json';
import zhCNAssetMarketInfoFetcher from '@/locales/zh-CN/asset-market-info-fetcher.json';
import zhCNAssetManagement from '@/locales/zh-CN/asset-management.json';
import zhCNNotification from '@/locales/zh-CN/notification.json';
import zhCNTask from '@/locales/zh-CN/task.json';
import zhCNScheduledJob from '@/locales/zh-CN/scheduled-job.json';
import zhCNAssetTrend from '@/locales/zh-CN/asset-trend.json';


import enUSCommon from '@/locales/en-US/common.json';
import enUSChat from '@/locales/en-US/chat.json';
import enUSTool from '@/locales/en-US/tool.json';
import enUSSetting from '@/locales/en-US/setting.json';
import enUSPlugin from '@/locales/en-US/plugin.json';
import enUSTopic from '@/locales/en-US/topic.json';
import enUSPortal from '@/locales/en-US/portal.json';
import enUSComponents from '@/locales/en-US/components.json';
import enUSSearch from '@/locales/en-US/search.json';
import enUSNote from '@/locales/en-US/note.json';
import enUSMarket from '@/locales/en-US/market.json';
import enUSReport from '@/locales/en-US/report.json';
import enUSTRansaction from '@/locales/en-US/transaction.json';
import enUSAsset from '@/locales/en-US/asset.json';
import enUSInsight from '@/locales/en-US/insight.json';
import enUSResearch from '@/locales/en-US/research.json';
import enUSSnapshot from '@/locales/en-US/snapshot.json';
import enUSAssetMeta from '@/locales/en-US/asset-meta.json';
import enUSAccount from '@/locales/en-US/account.json';
import enUSAssetMarketInfo from '@/locales/en-US/asset-market-info.json';
import enUSAssetMarketInfoFetcher from '@/locales/en-US/asset-market-info-fetcher.json';
import enUSAssetManagement from '@/locales/en-US/asset-management.json';
import enUSNotification from '@/locales/en-US/notification.json';
import enUSSettingNotification from '@/locales/en-US/setting.notification.json';
import enUSTask from '@/locales/en-US/task.json';
import enUSScheduledJob from '@/locales/en-US/scheduled-job.json';
import enUSAssetTrend from '@/locales/en-US/asset-trend.json';



export const resources = {
  'zh-CN': {
    common: zhCNCommon,
    chat: zhCNChat,
    tool: zhCNTool,
    setting: zhCNSetting,
    settingNotification: zhCNSettingNotification,
    plugin: zhCNPlugin,
    topic: zhCNTopic,
    portal: zhCNPortal,
    components: zhCNComponents,
    search: zhCNSearch,
    note: zhCNNote,
    market: zhCNMarket,
    report: zhCNReport,
    transaction: zhCNTransaction,
    asset: zhCNAsset,
    insight: zhCNInsight,
    research: zhCNResearch,
    snapshot: zhCNSnapshot,
    'asset-meta': zhCNAssetMeta,
    account: zhCNAccount,
    'asset-market-info': zhCNAssetMarketInfo,
    'asset-market-info-fetcher': zhCNAssetMarketInfoFetcher,
    'asset-management': zhCNAssetManagement,
    notification: zhCNNotification,
    task: zhCNTask,
    'scheduled-job': zhCNScheduledJob,
    'asset-trend': zhCNAssetTrend,
  },
  'en-US': {
    common: enUSCommon,
    chat: enUSChat,
    tool: enUSTool,
    setting: enUSSetting,
    settingNotification: enUSSettingNotification,
    plugin: enUSPlugin,
    topic: enUSTopic,
    portal: enUSPortal,
    components: enUSComponents,
    search: enUSSearch,
    note: enUSNote,
    market: enUSMarket,
    report: enUSReport,
    transaction: enUSTRansaction,
    asset: enUSAsset,
    insight: enUSInsight,
    research: enUSResearch,
    snapshot: enUSSnapshot,
    'asset-meta': enUSAssetMeta,
    account: enUSAccount,
    'asset-market-info': enUSAssetMarketInfo,
    'asset-market-info-fetcher': enUSAssetMarketInfoFetcher,
    'asset-management': enUSAssetManagement,
    notification: enUSNotification,
    task: enUSTask,
    'scheduled-job': enUSScheduledJob,
    'asset-trend': enUSAssetTrend,
  },

};

// Detect initial language from window.__INITIAL_LANGUAGE__ (set by inline script in layout)
// Falls back to localStorage, then browser language
const getInitialLanguage = (): SupportedLanguage => {
  if (typeof window === 'undefined') {
    return defaultLanguage;
  }

  // 优先使用 layout 中内联脚本设置的语言（避免闪烁）
  if (window.__INITIAL_LANGUAGE__ && supportedLanguages.includes(window.__INITIAL_LANGUAGE__ as SupportedLanguage)) {
    return window.__INITIAL_LANGUAGE__ as SupportedLanguage;
  }

  // 回退到 localStorage
  try {
    const stored = localStorage.getItem('LOBE_PREFERENCE');
    if (stored) {
      const preference = JSON.parse(stored);
      if (
        preference?.language &&
        supportedLanguages.includes(preference.language as SupportedLanguage)
      ) {
        return preference.language as SupportedLanguage;
      }
    }
  } catch {
    // Ignore errors
  }

  // Fall back to browser language
  const browserLang = navigator.language;
  if (supportedLanguages.includes(browserLang as SupportedLanguage)) {
    return browserLang as SupportedLanguage;
  }

  // Try to match partial language code (e.g., 'zh' -> 'zh-CN')
  const langPrefix = browserLang.split('-')[0];
  if (langPrefix === 'zh') {
    return 'zh-CN';
  }

  return defaultLanguage;
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: defaultLanguage,
  defaultNS,
  ns: namespaces,
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false, // Important: disable suspense for SSR compatibility
  },
  initImmediate: false, // Important: for SSR，
  missingKeyHandler: (_1, _2, key) => {
    console.error(`Missing key: ${key}`)
  }
});

export default i18n;
