import { UserGuide, UserPreference } from '@typings/user';
import { merge } from '@renderer/lib/utils/merge';
import { StateCreator } from 'zustand';
import type { UserStore } from '../../store';
import userService from '@renderer/services/user';

export interface PreferenceAction {
  updateGuideState: (guide: Partial<UserGuide>) => Promise<void>;
  updatePreference: (preference: Partial<UserPreference>, action?: any) => Promise<void>;
}

export const createPreferenceSlice: StateCreator<
  UserStore,
  [['zustand/devtools', never]],
  [],
  PreferenceAction
> = (set, get) => ({
  updateGuideState: async (guide) => {
    const { updatePreference } = get();
    const nextGuide = merge(get().preference.guide, guide);
    await updatePreference({ guide: nextGuide });
  },

  updatePreference: async (preference, action) => {
    const nextPreference = merge(get().preference, preference);

    set({ preference: nextPreference }, false, action || 'updatePreference');

    await userService.updatePreference(nextPreference);
  },
});
