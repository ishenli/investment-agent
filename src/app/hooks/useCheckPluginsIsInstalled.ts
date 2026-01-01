import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import { useToolStore } from '@renderer/store/tool';

export const useCheckPluginsIsInstalled = (plugins: string[]) => {
  const isDBInited = useGlobalStore(systemStatusSelectors.isDBInited);
  const checkPluginsIsInstalled = useToolStore((s) => s.useCheckPluginsIsInstalled);

  checkPluginsIsInstalled(isDBInited, plugins);
};
