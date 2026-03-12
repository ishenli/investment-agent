import { useSessionStore } from '@renderer/store/session';

export const useInitAgentConfig = () => {
  const [useFetchAgentConfig] = useSessionStore((s) => [s.useFetchAgentConfig]);

  const isLogin = true;

  const [sessionId] = useSessionStore((s) => [s.activeId]);

  const data = useFetchAgentConfig(isLogin, sessionId);

  return { ...data, isLoading: data.isLoading && isLogin };
};
