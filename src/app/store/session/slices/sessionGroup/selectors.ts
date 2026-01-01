import { SessionStore } from '@renderer/store/session';

const sessionGroupItems = (s: SessionStore) => s.sessionGroups;

const getGroupById = (id: string) => (s: SessionStore) =>
  sessionGroupItems(s).find((group) => group.id === id);

export const sessionGroupSelectors = {
  getGroupById,
  sessionGroupItems,
};
