import { useAgentStore } from '@renderer/store/agent';
import { useSessionStore } from '@renderer/store/session';

export const useInitAgentConfig = () => {
  const [useFetchAgentConfig] = useAgentStore((s) => [s.useFetchAgentConfig]);

  const isLogin = true;

  const [sessionId] = useSessionStore((s) => [s.activeId]);

  const data = useFetchAgentConfig(isLogin, sessionId);

  return { ...data, isLoading: data.isLoading && isLogin };
};
