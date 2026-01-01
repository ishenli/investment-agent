import { produce } from 'immer';
import { uniqBy } from 'lodash';
import useSWR, { SWRResponse, mutate } from 'swr';
import { StateCreator } from 'zustand/vanilla';

import { pluginService } from '@renderer/services/plugin';
import { toolService } from '@renderer/services/tool';
import { pluginStoreSelectors } from '@renderer/store/tool/selectors';
import { DiscoverPluginItem, PluginListResponse, PluginQueryParams } from '@/types/discover';
import { LobeTool } from '@/types/tool';
import { PluginInstallError } from '@/types/tool/plugin';

import { ToolStore } from '../../store';
import { PluginInstallProgress, PluginInstallStep, PluginStoreState } from './initialState';

const INSTALLED_PLUGINS = 'loadInstalledPlugins';

const n = (key: string) => `pluginStore/${key}`;

export interface PluginStoreAction {
  installPlugin: (identifier: string, source?: 'plugin' | 'customPlugin') => Promise<void>;
  installPlugins: (plugins: string[]) => Promise<void>;
  loadMorePlugins: () => void;
  refreshPlugins: () => Promise<void>;

  resetPluginList: (keywords?: string) => void;
  uninstallPlugin: (identifier: string) => Promise<void>;
  updateInstallLoadingState: (key: string, value: boolean | undefined) => void;
  updatePluginInstallProgress: (
    identifier: string,
    progress: PluginInstallProgress | undefined,
  ) => void;

  useFetchInstalledPlugins: (enabled: boolean) => SWRResponse<LobeTool[]>;
  useFetchPluginList: (params: PluginQueryParams) => SWRResponse<PluginListResponse>;
}

export const createPluginStoreSlice: StateCreator<
  ToolStore,
  [['zustand/devtools', never]],
  [],
  PluginStoreAction
> = (set, get) => ({
  installPlugin: async (name, type = 'plugin') => {
    const plugin = pluginStoreSelectors.getPluginById(name)(get());
    if (!plugin) return;

    const { updateInstallLoadingState, refreshPlugins } = get();
    try {
      updateInstallLoadingState(name, true);
      const data = await toolService.getToolManifest(plugin.manifest);

      await pluginService.installPlugin({ identifier: plugin.identifier, manifest: data, type });
      await refreshPlugins();

      updateInstallLoadingState(name, undefined);
    } catch (error) {
      console.error(error);

      const err = error as PluginInstallError;

      updateInstallLoadingState(name, undefined);

      // notification.error({
      //   description: t(`error.${err.message}`, { ns: 'plugin' }),
      //   message: t('error.installError', { name: plugin.title, ns: 'plugin' }),
      // });
    }
  },
  installPlugins: async (plugins) => {
    const { installPlugin } = get();

    await Promise.all(plugins.map((identifier) => installPlugin(identifier)));
  },
  loadMorePlugins: () => {
    const { oldPluginItems, pluginTotalCount, currentPluginPage } = get();

    // 检查是否还有更多数据可以加载
    if (oldPluginItems.length < (pluginTotalCount || 0)) {
      set(
        produce((draft: PluginStoreState) => {
          draft.currentPluginPage = currentPluginPage + 1;
        }),
        false,
        n('loadMorePlugins'),
      );
    }
  },
  refreshPlugins: async () => {
    await mutate(INSTALLED_PLUGINS);
  },
  resetPluginList: (keywords) => {
    set(
      produce((draft: PluginStoreState) => {
        draft.oldPluginItems = [];
        draft.currentPluginPage = 1;
        draft.pluginSearchKeywords = keywords;
      }),
      false,
      n('resetPluginList'),
    );
  },
  uninstallPlugin: async (identifier) => {
    await pluginService.uninstallPlugin(identifier);
    await get().refreshPlugins();
  },
  updateInstallLoadingState: (key, value) => {
    set(
      produce((draft: PluginStoreState) => {
        draft.pluginInstallLoading[key] = value;
      }),
      false,
      n('updateInstallLoadingState'),
    );
  },
  updatePluginInstallProgress: (identifier, progress) => {
    set(
      produce((draft: PluginStoreState) => {
        draft.pluginInstallProgress[identifier] = progress;
      }),
      false,
      n(`updatePluginInstallProgress/${progress?.step || 'clear'}`),
    );
  },

  useFetchInstalledPlugins: (enabled: boolean) =>
    useSWR<LobeTool[]>(enabled ? INSTALLED_PLUGINS : null, pluginService.getInstalledPlugins, {
      fallbackData: [],
      onSuccess: (data) => {
        set(
          { installedPlugins: data, loadingInstallPlugins: false },
          false,
          n('useFetchInstalledPlugins'),
        );
      },
      revalidateOnFocus: false,
      suspense: true,
    }),
  useFetchPluginList: (params) => {

    return useSWR<PluginListResponse>(
      ['useFetchPluginList', 'en', ...Object.values(params)].filter(Boolean).join('-'),
      async () => toolService.getOldPluginList(params),
      {
        onSuccess(data) {
          set(
            produce((draft: PluginStoreState) => {
              draft.pluginSearchLoading = false;

              // 设置基础信息
              if (!draft.isPluginListInit) {
                draft.activePluginIdentifier = data.items?.[0]?.identifier;
                draft.isPluginListInit = true;
                draft.pluginTotalCount = data.totalCount;
              }

              // 累积数据逻辑
              if (params.page === 1) {
                // 第一页，直接设置
                draft.oldPluginItems = uniqBy(data.items, 'identifier');
              } else {
                // 后续页面，累积数据
                draft.oldPluginItems = uniqBy(
                  [...draft.oldPluginItems, ...data.items],
                  'identifier',
                );
              }
            }),
            false,
            n('useFetchPluginList/onSuccess'),
          );
        },
        revalidateOnFocus: false,
      },
    );
  },
});
