import { LobeChatPluginManifest, pluginManifestSchema } from '@lobehub/chat-plugin-sdk';
import { uniqBy } from 'lodash';

import { ChatCompletionTool } from '@/types/openai/chat';
import { OpenAIPluginManifest } from '@/types/openai/plugin';
import { genToolCallingName } from './toolCall';


export const convertOpenAIManifestToLobeManifest = (
  data: OpenAIPluginManifest,
): LobeChatPluginManifest => {
  const manifest: LobeChatPluginManifest = {
    api: [],
    homepage: data.legal_info_url,
    identifier: data.name_for_model,
    meta: {
      avatar: data.logo_url,
      description: data.description_for_human,
      title: data.name_for_human,
    },
    openapi: data.api.url,
    systemRole: data.description_for_model,
    type: 'default',
    version: '1',
  };
  switch (data.auth.type) {
    case 'none': {
      break;
    }
    case 'service_http': {
      manifest.settings = {
        properties: {
          apiAuthKey: {
            default: data.auth.verification_tokens['openai'],
            description: 'API Key',
            format: 'password',
            title: 'API Key',
            type: 'string',
          },
        },
        type: 'object',
      };
      break;
    }
  }

  return manifest;
};

export const getToolManifest = async (
  url?: string,
  useProxy: boolean = false,
): Promise<LobeChatPluginManifest> => {
  // 1. valid plugin
  if (!url) {
    throw new TypeError('noManifest');
  }
  return {} as any;
};

/**
 *
 */
export const convertPluginManifestToToolsCalling = (
  manifests: LobeChatPluginManifest[],
): ChatCompletionTool[] => {
  const list = manifests.flatMap((manifest) =>
    manifest.api.map((m) => ({
      description: m.description,
      name: genToolCallingName(manifest.identifier, m.name, manifest.type),
      parameters: m.parameters,
    })),
  );

  return uniqBy(list, 'name').map((i) => ({ function: i, type: 'function' }));
};
