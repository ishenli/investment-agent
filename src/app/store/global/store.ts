import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';
import { generalActionSlice, GlobalGeneralAction } from './actions/general';
import { GlobalWorkspacePaneAction, globalWorkspaceSlice } from './actions/workspacePane';
import { GlobalState, initialState } from './initialState';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GlobalStore extends GlobalState, GlobalGeneralAction, GlobalWorkspacePaneAction {
  /* empty */
}

const createStore: StateCreator<GlobalStore, [['zustand/devtools', never]]> = (...parameters) => ({
  ...initialState,
  ...generalActionSlice(...parameters),
  ...globalWorkspaceSlice(...parameters),
});

export const useGlobalStore = createWithEqualityFn<GlobalStore>()(
  subscribeWithSelector(devtools(createStore)),
  shallow,
);
