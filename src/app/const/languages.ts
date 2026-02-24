export const DEFAULT_LANGUAGE = 'en-US' as const;

export const SUPPORTED_LANGUAGES = {
  'zh-CN': '简体中文',
  'en-US': 'English (US)',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;