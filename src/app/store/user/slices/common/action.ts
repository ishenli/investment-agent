import type { UserStore } from '@renderer/store/user';
import userService from '@renderer/services/user';
import i18nInstance, { supportedLanguages } from '@renderer/lib/i18n';
import { SupportedLanguage } from '@typings/user';
import { StateCreator } from 'zustand';

export interface CommonAction {
  refreshUserState: () => Promise<void>;
  initUserState: (params: { avatar: string }) => Promise<void>;
}

export const createCommonSlice: StateCreator<
  UserStore,
  [['zustand/devtools', never]],
  [],
  CommonAction
> = (set, get) => ({
  refreshUserState: async () => {},
  initUserState: async (params) => {
    // 从 localStorage 加载用户偏好设置
    const storedPreference = await userService.getUserPreference();
    
    // 优先使用 i18n 当前语言（已通过内联脚本正确初始化）
    const i18nLanguage = i18nInstance.language as SupportedLanguage;
    const isValidLanguage = supportedLanguages.includes(i18nLanguage);
    
    set({
      avatar: params.avatar,
      preference: {
        ...get().preference,
        // 如果 localStorage 没有语言设置，使用 i18n 的语言
        ...(storedPreference.language || !isValidLanguage ? {} : { language: i18nLanguage }),
        ...storedPreference,
      },
      isUserStateInit: true,
    });
  },
});
