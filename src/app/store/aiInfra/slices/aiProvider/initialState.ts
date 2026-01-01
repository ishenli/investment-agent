import { DEFAULT_PROVIDER } from '@renderer/const/settings';
import { EnabledAiModel } from '@typings/aiModel';
import {
  AiProviderDetailItem,
  AiProviderListItem,
  AiProviderRuntimeConfig,
  AiProviderSourceEnum,
  EnabledProvider,
  EnabledProviderWithModels,
} from '@typings/aiProvider';

export interface AIProviderState {
  activeAiProvider?: string;
  activeProviderModelList: any[];
  aiProviderConfigUpdatingIds: string[];
  aiProviderDetail?: AiProviderDetailItem | null;
  aiProviderList: AiProviderListItem[];
  aiProviderLoadingIds: string[];
  aiProviderRuntimeConfig: Record<string, AiProviderRuntimeConfig>;
  enabledAiModels?: EnabledAiModel[];
  enabledAiProviders?: EnabledProvider[];
  // used for select
  enabledChatModelList?: EnabledProviderWithModels[];
  enabledImageModelList?: EnabledProviderWithModels[];
  initAiProviderList: boolean;
  providerSearchKeyword: string;
}

export const initialAIProviderState: AIProviderState = {
  activeProviderModelList: [],
  aiProviderConfigUpdatingIds: [],
  aiProviderList: [],
  aiProviderLoadingIds: [],
  aiProviderRuntimeConfig: {},
  initAiProviderList: false,
  providerSearchKeyword: '',
  enabledChatModelList: [
    {
      id: DEFAULT_PROVIDER,
      name: '蚂蚁内部模型',
      logo: 'https://assets.alicdn.com/g/qwenweb/qwen-webui-fe/0.0.202/static/qwen_icon_light_84.png',
      source: AiProviderSourceEnum.Builtin,
      children: [
        {
          id: 'Qwen3-235B-A22B-Instruct-2507',
          displayName: 'Qwen3-235B-A22B-Instruct-2507',
          abilities: {},
          contextWindowTokens: 256000,
        },
        {
          id: 'Qwen3-235B-A22B-Thinking-2507',
          displayName: 'Qwen3-235B-A22B-Thinking-2507',
          abilities: {
            reasoning: true,
            functionCall: true,
          },
          contextWindowTokens: 262144,
        },
        {
          id: 'Qwen3-Next-80B-A3B-Instruct',
          displayName: 'Qwen3-Next-80B-A3B-Instruct',
          abilities: {},
          contextWindowTokens: 262144,
        },
        {
          id: 'Qwen3-Next-80B-A3B-Thinking',
          displayName: 'Qwen3-Next-80B-A3B-Thinking',
          abilities: {
            reasoning: true,
          },
          contextWindowTokens: 262144,
        },
        {
          id: 'Qwen3-Coder-480B-A35B-Instruct',
          displayName: 'Qwen3-Coder-480B-A35B-Instruct',
          abilities: {
            functionCall: true,
            reasoning: true,
          },
          contextWindowTokens: 262144,
        },
        {
          id: 'Kimi-K2-Instruct-0905',
          displayName: 'Kimi-K2-Instruct-0905',
          abilities: {
            functionCall: true,
          },
          contextWindowTokens: 256000,
        },
        {
          id: 'DeepSeek-V3.1',
          displayName: 'DeepSeek-V3.1',
          abilities: {
            functionCall: true,
          },
          contextWindowTokens: 128000,
        },
        {
          id: 'DeepSeek-R1-0528',
          displayName: 'DeepSeek-R1-0528',
          abilities: {
            functionCall: true,
            reasoning: true,
          },
          contextWindowTokens: 64000,
        },
      ],
    },
  ],
  enabledImageModelList: [],
};
