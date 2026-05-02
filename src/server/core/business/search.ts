/**
 * Search Business Logic
 *
 * 纯业务函数，无框架耦合。
 */
import * as TavilyCore from '@tavily/core';
import settingService from '@/server/service/settingService';
import logger from '@/server/base/logger';

/**
 * Tavily 互联网搜索
 */
export async function tavilySearch(query: string): Promise<string> {
  logger.info(`[business/search] tavilySearch: ${query}`);
  try {
    const tavilyApiKey = await settingService.getConfigValueByKey('TAVILY_API_KEY');
    if (!tavilyApiKey) {
      throw new Error('未配置 TAVILY_API_KEY');
    }
    const tavilyClient = TavilyCore.tavily({ apiKey: tavilyApiKey });
    const result = await tavilyClient.search(query);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    throw new Error(`搜索失败: ${(e as Error).message}`);
  }
}
