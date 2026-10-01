import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import { Type, type TObject } from '@sinclair/typebox';
import { z } from 'zod';
import logger from '@server/base/logger';
import { searchAssetInfo } from '@server/dataflows/finnhubUtil';

import type { HermesToolConfig } from './types';

// ============== Core Logic ==============

async function executeAssetInfoQuery(query: string): Promise<string> {
  logger.info(`[searchAssetInfoTool]: ${query}`);
  try {
    const result = await searchAssetInfo(query);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    logger.error(`[searchAssetInfoTool] query failed:`, error);
    return `资产信息查询失败: ${errorMsg}`;
  }
}

// ============== Claude Agent SDK Adapter ==============

export const searchAssetInfoClaudeTool = claudeTool(
  'searchAssetInfoTool',
  '查询市场资产信息，当前支持查询股票、基金、黄金。当询问资产价格的时候，必须使用此工具查询',
  {
    query: z.string().describe('市场资产查询请求'),
  },
  async (args) => {
    try {
      const result = await executeAssetInfoQuery(args.query);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      logger.error(`[searchAssetInfoClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `资产信息查询失败: ${errorMsg}` }], isError: true };
    }
  },
);

// ============== Hermes Adapter ==============

const assetSearchSchema: TObject = Type.Object({
  query: Type.String({ description: '市场资产查询关键词' }),
});

export const assetSearchHermesConfig: HermesToolConfig = {
  name: 'asset_search',
  description: '查询市场资产信息（股票、基金、黄金等），当询问资产价格时使用',
  schema: assetSearchSchema,
  handler: async (_id, args) => {
    try {
      const result = await executeAssetInfoQuery(String(args.query));
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};