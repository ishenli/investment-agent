import logger from '@server/base/logger';
import { queryPortfolio } from '@server/core/business';
import { tool as langchainTool } from 'langchain';
import z from 'zod';

/**
 * Portfolio query parameters schema
 */
const PortfolioQueryParams = z.object({
  account_id: z.string().describe('User account ID'),
});

/**
 * Portfolio query core logic
 */
async function executePortfolioQuery(accountId: string): Promise<string> {
  try {
    return await queryPortfolio(accountId);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[portfolioQueryTool] query failed:`, error);
    return `Portfolio query failed: ${errorMsg}`;
  }
}

/**
 * LangChain-standard portfolio query tool
 */
export const portfolioQueryTool = langchainTool(
  async (params): Promise<string> => {
    const { account_id } = params as z.infer<typeof PortfolioQueryParams>;
    return executePortfolioQuery(account_id);
  },
  {
    name: 'portfolioQueryTool',
    description:
      '查询用户投资组合概览，包括总市值、持仓明细、未实现盈亏、风险等级等。' +
      '当用户询问持仓、资产、盈亏、组合或风险时，优先调用此工具。',
    schema: PortfolioQueryParams,
  },
);
