import logger from '@server/base/logger';
import { queryPortfolio } from '@server/core/business';
import { Type, type TObject } from '@sinclair/typebox';

import type { HermesToolConfig } from './types';

// ============== Core Logic ==============

async function executePortfolioQuery(accountId?: string): Promise<string> {
  try {
    return await queryPortfolio(accountId ?? '');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[PortfolioQueryTool] query failed:`, error);
    return `Portfolio query failed: ${errorMsg}`;
  }
}

// ============== Hermes Adapter ==============

const portfolioQuerySchema: TObject = Type.Object({});

export const portfolioQueryHermesConfig: HermesToolConfig = {
  name: 'portfolio_query',
  description: '查询用户投资组合概览，包括总市值、持仓明细、未实现盈亏、风险等级等',
  schema: portfolioQuerySchema,
  handler: async (_id, _args) => {
    try {
      const result = await executePortfolioQuery();
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};