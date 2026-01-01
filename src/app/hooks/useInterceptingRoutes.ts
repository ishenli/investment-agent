import { useAgentStore } from '@renderer/store/agent';
import { ChatSettingsTabs } from '@renderer/store/global/initialState';
import { useSessionStore } from '@renderer/store/session';
import { useMemo } from 'react';

export const useOpenChatSettings = (tab: ChatSettingsTabs = ChatSettingsTabs.Meta) => {
  const activeId = useSessionStore((s) => s.activeId);
  return useMemo(() => {
    return () => {
      useAgentStore.setState({ showAgentSetting: true });
    };
  }, [activeId, tab]);
};
