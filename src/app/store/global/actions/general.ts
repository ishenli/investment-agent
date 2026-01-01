import type { SystemStatus } from '@renderer/store/global/initialState';
import { merge } from '@renderer/lib/utils/merge';
import isEqual from 'fast-deep-equal';
import type { StateCreator } from 'zustand/vanilla';
import type { GlobalStore } from '../store';

export interface GlobalGeneralAction {
  updateSystemStatus: (status: Partial<SystemStatus>, action?: any) => void;
}

export const generalActionSlice: StateCreator<
  GlobalStore,
  [['zustand/devtools', never]],
  [],
  GlobalGeneralAction
> = (set, get) => ({
  updateSystemStatus: (status, action) => {
    if (!get().isStatusInit) return;

    const nextStatus = merge(get().status, status);

    if (isEqual(get().status, nextStatus)) return;

    set({ status: nextStatus }, false, action || 'updateSystemStatus');
    get().statusStorage.saveToLocalStorage(nextStatus);
  },
});
