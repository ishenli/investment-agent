import type { UserStore } from '@renderer/store/user';
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
    set({
      avatar: params.avatar,
    });
  },
});
