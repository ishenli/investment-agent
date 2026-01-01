import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import logger from '@server/base/logger';
import { searchAssetInfo } from '@server/dataflows/finnhubUtil';

// 市场资产信息查询参数
const AssetInfoParams = z.object({
  query: z.string().describe('市场资产查询请求'),
});

/**
 * 市场资产信息查询工具，是一个比较通用的工具
 * 通过灵犀的 Agent 提供服务
 * @description 查询市场资产信息，当前支持查询股票、基金、黄金。当询问资产价格的时候，必须使用此工具查询
 */
export const searchAssetInfoTool = tool(
  async (params): Promise<string> => {
    const { query } = params as z.infer<typeof AssetInfoParams>;
    logger.info(`[searchAssetInfoTool]: ${query}`);
    try {
      const result = await searchAssetInfo(query);
      return result;
    } catch (error) {
      return `资产信息查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  },
  {
    name: 'searchAssetInfoTool',
    description:
      '查询市场资产信息，当前支持查询股票、基金、黄金。当询问资产价格的时候，必须使用此工具查询',
    schema: AssetInfoParams,
  },
);