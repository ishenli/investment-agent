import { StateCreator } from 'zustand/vanilla';

import { sessionService } from '@renderer/services/session';
import { SessionStore } from '@renderer/store/session';
import { SessionGroupItem } from '@typings/session';

import { SessionGroupsDispatch, sessionGroupsReducer } from './reducer';

export interface SessionGroupAction {
  addSessionGroup: (name: string) => Promise<string>;
  clearSessionGroups: () => Promise<void>;
  removeSessionGroup: (id: string) => Promise<void>;
  updateSessionGroupName: (id: string, name: string) => Promise<void>;
  updateSessionGroupSort: (items: SessionGroupItem[]) => Promise<void>;
  internal_dispatchSessionGroups: (payload: SessionGroupsDispatch) => void;
}
/* eslint-enable */

export const createSessionGroupSlice: StateCreator<
  SessionStore,
  [['zustand/devtools', never]],
  [],
  SessionGroupAction
> = (set, get) => ({
  addSessionGroup: async (name) => {
    const id = await sessionService.createSessionGroup(name);

    await get().refreshSessions();

    return id;
  },

  clearSessionGroups: async () => {
    await sessionService.removeSessionGroups();
    await get().refreshSessions();
  },

  removeSessionGroup: async (id) => {
    await sessionService.removeSessionGroup(id);
    await get().refreshSessions();
  },

  updateSessionGroupName: async (id, name) => {
    await sessionService.updateSessionGroup(id, { name });
    await get().refreshSessions();
  },
  updateSessionGroupSort: async (items) => {},

  internal_dispatchSessionGroups: (payload) => {
    const nextSessionGroups = sessionGroupsReducer(get().sessionGroups, payload);
    get().internal_processSessions(get().sessions, nextSessionGroups, 'updateSessionGroups');
  },
});
