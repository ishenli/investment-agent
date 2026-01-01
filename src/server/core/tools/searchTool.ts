import logger from "@/server/base/logger";
import settingService from "@/server/service/settingService";
import { tool } from "langchain";
import z from "zod";
import * as TavilyCore from '@tavily/core'


// 帮我实现一个 note 的 query 工具
const SearchQueryParams = z.object({
  query: z.string().describe('Note query keyword'),
});

export const TravilySearchTool = tool(
  async (params): Promise<string> => {
    try {
      const { query } = params as z.infer<typeof SearchQueryParams>;
      logger.info(`[TravilySearchTool]: ${query}`);
      const tavilyApiKey = await settingService.getConfigValueByKey('TAVILY_API_KEY')
      const tavilyClient = TavilyCore.tavily({ apiKey: tavilyApiKey });
      const result = await tavilyClient.search(query)
      
      logger.info(`[TravilySearchTool] search result count: ${result?.results.length}`);
      return `TravilySearchTool query result: ${result}`;
    } catch (error) {
      logger.error(`[TravilySearchTool]:`, error);
      return `TravilySearchTool query failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
  {
    name: 'TravilySearchTool',
    description: '通过 Tavily 搜索互联网信息，能够快速搜索到最新的互联网信息',
    schema: SearchQueryParams,
  },
);