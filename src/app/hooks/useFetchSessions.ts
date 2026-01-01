import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import { useSessionStore } from '@renderer/store/session';

export const useFetchSessions = () => {
  const isDBInited = useGlobalStore(systemStatusSelectors.isDBInited);
  const useFetchSessions = useSessionStore((s) => s.useFetchSessions);

  useFetchSessions(isDBInited, true);
};
