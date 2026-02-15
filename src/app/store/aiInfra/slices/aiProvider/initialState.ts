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
  // Loading states for model fetching
  loadingModels: boolean;
  loadingModelsError: string | null;
}

export const initialAIProviderState: AIProviderState = {
  activeProviderModelList: [],
  aiProviderConfigUpdatingIds: [],
  aiProviderList: [],
  aiProviderLoadingIds: [],
  aiProviderRuntimeConfig: {},
  initAiProviderList: false,
  providerSearchKeyword: '',
  enabledChatModelList: [],
  enabledImageModelList: [],
  loadingModels: false,
  loadingModelsError: null,
};
