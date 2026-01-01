import { ChatModelCard } from '@typings/llm';

/**
 * Parse model string to add or remove models.
 */
export const parseModelString = (modelString: string = '', withDeploymentName = false) => {
  let models: ChatModelCard[] = [];
  let removeAll = false;
  const removedModels: string[] = [];
  const modelNames = modelString.split(/[,，]/).filter(Boolean);

  for (const item of modelNames) {
    const disable = item.startsWith('-');
    const nameConfig = item.startsWith('+') || item.startsWith('-') ? item.slice(1) : item;
    const [idAndDisplayName, ...capabilities] = nameConfig.split('<');
    let [id, displayName] = idAndDisplayName.split('=');

    let deploymentName: string | undefined;

    if (withDeploymentName) {
      [id, deploymentName] = id.split('->');
      if (!deploymentName) deploymentName = id;
    }

    if (disable) {
      // Disable all models.
      if (id === 'all') {
        removeAll = true;
      }
      removedModels.push(id);
      continue;
    }

    // remove empty model name
    if (!item.trim().length) {
      continue;
    }

    // Remove duplicate model entries.
    const existingIndex = models.findIndex(({ id: n }) => n === id);
    if (existingIndex !== -1) {
      models.splice(existingIndex, 1);
    }

    const model: ChatModelCard = {
      displayName: displayName || undefined,
      id,
    };

    if (deploymentName) {
      model.deploymentName = deploymentName;
    }

    if (capabilities.length > 0) {
      const [maxTokenStr, ...capabilityList] = capabilities[0].replace('>', '').split(':');
      model.contextWindowTokens = parseInt(maxTokenStr, 10) || undefined;

      for (const capability of capabilityList) {
        switch (capability) {
          case 'reasoning': {
            model.reasoning = true;
            break;
          }
          case 'vision': {
            model.vision = true;
            break;
          }
          case 'fc': {
            model.functionCall = true;
            break;
          }
          case 'file': {
            model.files = true;
            break;
          }
          default: {
            console.warn(`Unknown capability: ${capability}`);
          }
        }
      }
    }

    models.push(model);
  }

  return {
    add: models,
    removeAll,
    removed: removedModels,
  };
};

/**
 * Extract a special method to process chatModels
 */
export const transformToChatModelCards = ({
  modelString = '',
  defaultChatModels,
  withDeploymentName = false,
}: {
  defaultChatModels: ChatModelCard[];
  modelString?: string;
  withDeploymentName?: boolean;
}): ChatModelCard[] | undefined => {
  if (!modelString) return undefined;

  const modelConfig = parseModelString(modelString, withDeploymentName);
  let chatModels = modelConfig.removeAll ? [] : defaultChatModels;

  // 处理移除逻辑
  if (!modelConfig.removeAll) {
    chatModels = chatModels.filter((m) => !modelConfig.removed.includes(m.id));
  }

  return chatModels;
};

export const extractEnabledModels = (modelString: string = '', withDeploymentName = false) => {
  const modelConfig = parseModelString(modelString, withDeploymentName);
  const list = modelConfig.add.map((m) => m.id);

  if (list.length === 0) return;

  return list;
};
