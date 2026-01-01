import { produce } from 'immer';
import type { StateCreator } from 'zustand/vanilla';

import type { GlobalStore } from '@renderer/store/global';

export interface GlobalWorkspacePaneAction {
  switchBackToChat: (sessionId?: string) => void;
  toggleAgentSystemRoleExpand: (agentId: string, expanded?: boolean) => void;
  toggleChatSideBar: (visible?: boolean) => void;
  toggleExpandSessionGroup: (id: string, expand: boolean) => void;
  toggleMobilePortal: (visible?: boolean) => void;
  toggleMobileTopic: (visible?: boolean) => void;
  toggleSystemRole: (visible?: boolean) => void;
  toggleZenMode: () => void;
}

export const globalWorkspaceSlice: StateCreator<
  GlobalStore,
  [['zustand/devtools', never]],
  [],
  GlobalWorkspacePaneAction
> = (set, get) => ({
  switchBackToChat: (_sessionId) => {
    // get().router?.push(SESSION_CHAT_URL(sessionId || INBOX_SESSION_ID, get().isMobile));
  },

  toggleAgentSystemRoleExpand: (agentId, expanded) => {
    const { status } = get();
    const systemRoleExpandedMap = status.systemRoleExpandedMap || {};
    const nextExpanded = typeof expanded === 'boolean' ? expanded : !systemRoleExpandedMap[agentId];

    get().updateSystemStatus(
      {
        systemRoleExpandedMap: {
          ...systemRoleExpandedMap,
          [agentId]: nextExpanded,
        },
      },
      'toggleAgentSystemRoleExpand',
    );
  },
  toggleChatSideBar: (newValue) => {
    const showChatSideBar =
      typeof newValue === 'boolean' ? newValue : !get().status.showChatSideBar;

    get().updateSystemStatus({ showChatSideBar }, 'toggleAgentPanel');
  },
  toggleExpandSessionGroup: (id, expand) => {
    const { status } = get();
    const nextExpandSessionGroup = produce(status.expandSessionGroupKeys, (draft: string[]) => {
      if (expand) {
        if (draft.includes(id)) return;
        draft.push(id);
      } else {
        const index = draft.indexOf(id);
        if (index !== -1) draft.splice(index, 1);
      }
    });
    get().updateSystemStatus({
      expandSessionGroupKeys: nextExpandSessionGroup,
    });
  },
  toggleMobilePortal: (newValue) => {
    const mobileShowPortal =
      typeof newValue === 'boolean' ? newValue : !get().status.mobileShowPortal;

    get().updateSystemStatus({ mobileShowPortal }, 'toggleMobilePortal');
  },
  toggleMobileTopic: (newValue) => {
    const mobileShowTopic =
      typeof newValue === 'boolean' ? newValue : !get().status.mobileShowTopic;

    get().updateSystemStatus({ mobileShowTopic }, 'toggleMobileTopic');
  },
  toggleSystemRole: (newValue) => {
    const showSystemRole = typeof newValue === 'boolean' ? newValue : !get().status.mobileShowTopic;

    get().updateSystemStatus({ showSystemRole }, 'toggleMobileTopic');
  },
  toggleZenMode: () => {
    const { status } = get();
    const nextZenMode = !status.zenMode;

    get().updateSystemStatus({ zenMode: nextZenMode }, 'toggleZenMode');
  },
});
