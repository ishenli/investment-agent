import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import { useToolStore } from '@renderer/store/tool';

export const useFetchInstalledPlugins = () => {
  const isDBInited = useGlobalStore(systemStatusSelectors.isDBInited);
  const [useFetchInstalledPlugins] = useToolStore((s) => [s.useFetchInstalledPlugins]);

  return useFetchInstalledPlugins(isDBInited);
};
