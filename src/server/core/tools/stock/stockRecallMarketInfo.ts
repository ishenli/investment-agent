import logger from '@server/base/logger';
import assetMarketInfoService from '@server/service/assetMarketInfoService';
import { tool } from 'langchain';
import z from 'zod';

const AssetSymbolParams = z.object({
  symbol: z.string().describe('资产代号、可能是股票、ETF等'),
});
/**
 * 根据资产代号，获取 assetMarketInfoService.getLatestAssetMarketInfoBySymbol 中的最新内容
 */
export const stockRecallMarketInfoTool = tool(
  async (params): Promise<string> => {
    const { symbol } = params as  z.infer<typeof AssetSymbolParams>;
    logger.info(`[recallAssetMarketInfoTool]: ${symbol}`);
    try {
      const result = await assetMarketInfoService.getLatestAssetMarketInfoBySymbol(symbol);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      return `资产信息查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  },
  {
    name: 'stockRecallMarketInfoTool',
    description: '查询个人知识库中记录的市场股票评级、市场财报分析、市场的投资笔记等使用此工具',
    schema: AssetSymbolParams,
  },
);
