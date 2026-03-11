import { pluginPrompts } from '@renderer/prompts/plugin';
import { LobeChatPluginManifest } from '@lobehub/chat-plugin-sdk';

import { MetaData } from '@/types/meta';
import { ChatCompletionTool } from '@/types/openai/chat';
import { LobeToolMeta } from '@/types/tool/tool';
import { genToolCallingName } from '@renderer/lib/utils/toolCall';
import { convertPluginManifestToToolsCalling } from '@renderer/lib/utils/toolManifest';

import { pluginHelpers } from '../helpers';
import { ToolStoreState } from '../initialState';
import { builtinToolSelectors } from '../slices/builtin/selectors';

const enabledSchema =
  (tools: string[] = []) =>
  (s: ToolStoreState): ChatCompletionTool[] => {
    const manifests = s.builtinTools
      .map((b) => b.manifest as LobeChatPluginManifest)
      .filter((m) => tools.includes(m?.identifier));

    return convertPluginManifestToToolsCalling(manifests);
  };

const enabledSystemRoles =
  (tools: string[] = []) =>
  (s: ToolStoreState) => {
    const toolsSystemRole = s.builtinTools
      .map((b) => b.manifest as LobeChatPluginManifest)
      .filter((m) => m && tools.includes(m.identifier))
      .map((manifest) => {
        const meta = manifest.meta || {};

        const title = pluginHelpers.getPluginTitle(meta) || manifest.identifier;
        const systemRole = manifest.systemRole || pluginHelpers.getPluginDesc(meta);

        return {
          apis: manifest.api.map((m) => ({
            desc: m.description,
            name: genToolCallingName(manifest.identifier, m.name, manifest.type),
          })),
          identifier: manifest.identifier,
          name: title,
          systemRole,
        };
      });

    if (toolsSystemRole.length > 0) {
      return pluginPrompts({ tools: toolsSystemRole });
    }

    return '';
  };

const metaList =
  (showDalle?: boolean) =>
  (s: ToolStoreState): LobeToolMeta[] => {
    return builtinToolSelectors.metaList(showDalle)(s);
  };

const getMetaById =
  (id: string, showDalle: boolean = true) =>
  (s: ToolStoreState): MetaData | undefined => {
    const item = metaList(showDalle)(s).find((m) => m.identifier === id);

    if (!item) return;

    if (item.meta) return item.meta;

    return {
      avatar: item?.avatar,
      backgroundColor: item?.backgroundColor,
      description: item?.description,
      title: item?.title,
    };
  };

const getManifestById =
  (id: string) =>
  (s: ToolStoreState): LobeChatPluginManifest | undefined =>
    s.builtinTools
      .map((b) => b.manifest as LobeChatPluginManifest)
      .find((i) => i.identifier === id);

// 获取插件 manifest 加载状态
const getManifestLoadingStatus = (id: string) => (s: ToolStoreState) => {
  const manifest = getManifestById(id)(s);

  if (!manifest) return 'error';

  if (!!manifest) return 'success';
};

const isToolHasUI = (id: string) => (s: ToolStoreState) => {
  const manifest = getManifestById(id)(s);
  if (!manifest) return false;
  const builtinTool = s.builtinTools.find((tool) => tool.identifier === id);

  if (builtinTool && builtinTool.type === 'builtin') {
    return true;
  }

  return !!manifest.ui;
};

export const toolSelectors = {
  enabledSchema,
  enabledSystemRoles,
  getManifestById,
  getManifestLoadingStatus,
  getMetaById,
  isToolHasUI,
  metaList,
};
