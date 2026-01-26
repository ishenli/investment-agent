// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import * as finnhub from 'finnhub';
import { ChatAgentProxy } from '@server/core/provider/chatAgent';

const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY;

export const finnhubClient = new finnhub.DefaultApi();


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
