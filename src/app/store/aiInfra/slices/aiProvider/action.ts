import { StateCreator } from 'zustand/vanilla';
import { AiInfraStore } from '../../store';
import { EnabledProviderWithModels, AiProviderSourceEnum } from '@typings/aiProvider';
import { AiModelForSelect, ModelAbilities } from '@typings/aiModel';

// Define the API response type
interface AvailableModelsResponse {
  models: Array<{
    id: number;
    providerId: number;
    slug: string;
    name: string;
    contextWindow: number | null;
    supportsVision: boolean;
    supportsFunctionCalling: boolean;
    isActive: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
    providerName: string;
    providerSlug: string;
  }>;
  defaultModel: string | null;
}

export interface AiProviderAction {
  /**
   * Fetch available models from modelProvider API
   * Transforms the response to match EnabledProviderWithModels interface
   */
  fetchAvailableModels: () => Promise<void>;

  /**
   * Set loading state for models
   */
  setModelsLoading: (loading: boolean) => void;

  /**
   * Set error state for models
   */
  setModelsError: (error: string | null) => void;

  /**
   * Reset enabled chat model list to empty
   */
  resetEnabledChatModels: () => void;
}

/**
 * Transform ProviderModel data to EnabledProviderWithModels format
 *
 * Groups models by their provider and creates the structure expected by
 * the existing UI components that use enabledChatModelList
 */
function transformModelsToProviderFormat(models: AvailableModelsResponse['models']): EnabledProviderWithModels[] {
  // Group models by provider
  const groupedByProvider = models.reduce((acc, model) => {
    if (!acc[model.providerSlug]) {
      acc[model.providerSlug] = {
        id: model.providerSlug,
        name: model.providerName,
        source: AiProviderSourceEnum.Custom, // All user-configured providers are custom
        children: [] as AiModelForSelect[],
      };
    }

    // Construct abilities based on model properties
    const abilities: ModelAbilities = {};
    if (model.supportsFunctionCalling) {
      abilities.functionCall = true;
    }
    if (model.supportsVision) {
      abilities.vision = true;
    }

    acc[model.providerSlug].children.push({
      id: model.slug,
      displayName: model.name,
      abilities,
      contextWindowTokens: model.contextWindow || undefined,
    });

    return acc;
  }, {} as Record<string, EnabledProviderWithModels>);

  // Convert to array and sort by provider name
  return Object.values(groupedByProvider).sort((a, b) => a.name.localeCompare(b.name));
}

export const createAiProviderSlice: StateCreator<
  AiInfraStore,
  [['zustand/devtools', never]],
  [],
  AiProviderAction
> = (set, get) => ({
  fetchAvailableModels: async () => {
    set({ loadingModels: true, loadingModelsError: null });

    try {
      const response = await fetch('/api/model-providers/models/available', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        const { models } = result.data;

        // Transform the data structure
        const enabledChatModelList = transformModelsToProviderFormat(models);

        set({
          enabledChatModelList,
          loadingModels: false,
          initAiProviderList: true,
        });
      } else {
        set({
          loadingModelsError: result.error?.message || '获取可用模型列表失败',
          loadingModels: false,
        });
      }
    } catch (error) {
      set({
        loadingModelsError: '获取可用模型列表失败',
        loadingModels: false,
      });
    }
  },

  setModelsLoading: (loading) => {
    set({ loadingModels: loading });
  },

  setModelsError: (error) => {
    set({ loadingModelsError: error });
  },

  resetEnabledChatModels: () => {
    set({ enabledChatModelList: [] });
  },
});