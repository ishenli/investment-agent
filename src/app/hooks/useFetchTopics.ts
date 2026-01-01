import { useChatStore } from '@renderer/store/chat';
import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import { useSessionStore } from '@renderer/store/session';

/**
 * Fetch topics for the current session
 */
export const useFetchTopics = () => {
  const [sessionId] = useSessionStore((s) => [s.activeId]);
  const useFetchTopics = useChatStore((s) => s.useFetchTopics);
  const isDBInited = useGlobalStore(systemStatusSelectors.isDBInited);

  useFetchTopics(isDBInited, sessionId);
};
