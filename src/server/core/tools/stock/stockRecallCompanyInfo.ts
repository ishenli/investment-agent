import logger from '@server/base/logger';
import assetCompanyInfoService from '@server/service/assetCompanyInfoService';
import assetMarketInfoService from '@server/service/assetMarketInfoService';
import { tool } from 'langchain';
import z from 'zod';

const AssetSymbolParams = z.object({
  symbol: z.string().describe('资产代号、可能是公司名称、股票、ETF等'),
});

/**
 * 根据资产代号，获取 assetCompanyInfoService.getLatestAssetCompanyInfoBySymbol 中的最新内容
 */
export const stockRecallCompanyInfoTool = tool(
  async (params): Promise<string> => {
    const { symbol } = params as z.infer<typeof AssetSymbolParams>;
    logger.info(`[recallCompanyInfoTool]: ${symbol}`);
    try {
      const result = await assetCompanyInfoService.getLatestAssetCompanyInfoBySymbol(symbol);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      return `公司信息查询失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  },
  {
    name: 'stockRecallCompanyInfoTool',
    description: '查询知识库中关于记录的股票或者公司财务信息、管理层人员信息、每个季度的财报历史等使用此工具',
    schema: AssetSymbolParams,
  },
);
