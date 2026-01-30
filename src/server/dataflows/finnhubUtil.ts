// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import * as finnhub from 'finnhub';
import { ChatAgentProxy } from '@server/core/provider/chatAgent';

/**
 * Finnhub API 配置与客户端实例
 * 统一管理所有 Finnhub API 的配置和客户端实例
 */
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY;

finnhub.ApiClient.instance.basePath =
  process.env.FINNHUB_BASE_PATH || finnhub.ApiClient.instance.basePath;
finnhub.ApiClient.instance.timeout = 30000;

export const finnhubClient = new finnhub.DefaultApi();

/**
 * 检查 Finnhub API key 是否已配置
 */
export function isFinnhubApiKeySet(): boolean {
  return !!process.env.FINNHUB_API_KEY;
}

export async function searchNews(query: string): Promise<string> {
  const agent = new ChatAgentProxy({ agentId: 'sousugongju' });
  const response = await agent.invoke(query);
  return response.text;
}

export async function searchAssetInfo(query: string): Promise<string> {
  const agent = new ChatAgentProxy({ agentId: 'gupiaoshichangchaxungongju' });
  const response = await agent.invoke(query);
  return response.text;
}
