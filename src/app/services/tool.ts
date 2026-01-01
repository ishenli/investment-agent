import { PluginQueryParams } from '@/types/discover';
import { convertOpenAIManifestToLobeManifest, getToolManifest } from '../lib/utils/toolManifest';

class ToolService {
  getOldPluginList = async (params: PluginQueryParams): Promise<any> => {};
  getToolManifest = getToolManifest;
  convertOpenAIManifestToLobeManifest = convertOpenAIManifestToLobeManifest;
}

export const toolService = new ToolService();
