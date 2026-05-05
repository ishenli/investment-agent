import logger from '@server/base/logger';
import {
  getTransactionHistory,
  getTransactionHistoryByDateRange,
  getAccountBalance,
  getTransactionSummary,
  addTransaction,
} from '@server/core/business';
import { tool as langchainTool } from 'langchain';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import z from 'zod';

// ============== Schemas ==============

const TransactionHistoryParams = z.object({
  limit: z.number().optional().describe('返回记录数量限制（默认 50）'),
  offset: z.number().optional().describe('偏移量（用于分页，默认 0）'),
});

const TransactionHistoryByDateParams = z.object({
  start_date: z.string().describe('开始日期（YYYY-MM-DD 格式）'),
  end_date: z.string().describe('结束日期（YYYY-MM-DD 格式）'),
  limit: z.number().optional().describe('返回记录数量限制'),
  offset: z.number().optional().describe('偏移量（用于分页）'),
});

const AccountBalanceParams = z.object({
  before_transaction_id: z.string().optional().describe('计算到指定交易之前的余额'),
});

const TransactionSummaryParams = z.object({
  limit: z.number().optional().describe('记录数量限制（默认 50）'),
});

const AddTransactionParams = z.object({
  account_id: z.string().describe('账户 ID'),
  type: z.enum(['deposit', 'withdrawal', 'buy', 'sell']).describe('交易类型'),
  amount: z.number().optional().describe('金额（存款/取款时必填）'),
  sector: z.enum(['stock', 'etf', 'fund', 'crypto']).optional().describe('资产类型，默认 stock'),
  market: z.enum(['US', 'CN', 'HK']).optional().describe('市场'),
  symbol: z.string().optional().describe('股票代码（买入/卖出时必填）'),
  quantity: z.number().optional().describe('数量（买入/卖出时必填）'),
  price: z.number().optional().describe('价格（买入/卖出时必填）'),
  description: z.string().optional().describe('交易描述'),
  trade_time: z.string().optional().describe('交易时间（ISO 格式）'),
});

// ============== Core Logic ==============

async function executeGetTransactionHistory(
  limit?: number,
  offset?: number,
): Promise<string> {
  try {
    return await getTransactionHistory('', limit, offset);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[transactionHistoryTool] query failed:`, error);
    return `交易历史查询失败: ${errorMsg}`;
  }
}

async function executeGetTransactionHistoryByDate(
  startDate: string,
  endDate: string,
  limit?: number,
  offset?: number,
): Promise<string> {
  try {
    return await getTransactionHistoryByDateRange('', startDate, endDate, limit, offset);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[transactionHistoryByDateTool] query failed:`, error);
    return `按日期查询交易历史失败: ${errorMsg}`;
  }
}

async function executeGetAccountBalance(
  beforeTransactionId?: string,
): Promise<string> {
  try {
    return await getAccountBalance('', beforeTransactionId);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[accountBalanceTool] query failed:`, error);
    return `账户余额查询失败: ${errorMsg}`;
  }
}

async function executeGetTransactionSummary(
  limit?: number,
): Promise<string> {
  try {
    return await getTransactionSummary('', limit);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[transactionSummaryTool] query failed:`, error);
    return `交易摘要查询失败: ${errorMsg}`;
  }
}

async function executeAddTransaction(params: {
  account_id: string;
  type: 'deposit' | 'withdrawal' | 'buy' | 'sell';
  amount?: number;
  sector?: 'stock' | 'etf' | 'fund' | 'crypto';
  market?: 'US' | 'CN' | 'HK';
  symbol?: string;
  quantity?: number;
  price?: number;
  description?: string;
  trade_time?: string;
}): Promise<string> {
  try {
    return await addTransaction({
      accountId: params.account_id,
      type: params.type,
      amount: params.amount,
      sector: params.sector,
      market: params.market,
      symbol: params.symbol,
      quantity: params.quantity,
      price: params.price,
      description: params.description,
      tradeTime: params.trade_time,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[addTransactionTool] failed:`, error);
    return `交易记录创建失败: ${errorMsg}`;
  }
}

// ============== LangChain Tools ==============

export const transactionHistoryTool = langchainTool(
  async (params): Promise<string> => {
    const { limit, offset } = params as z.infer<typeof TransactionHistoryParams>;
    return executeGetTransactionHistory(limit, offset);
  },
  {
    name: 'transactionHistoryTool',
    description: '获取账户的交易历史记录，包括存款、取款、买入、卖出等',
    schema: TransactionHistoryParams,
  },
);

export const transactionHistoryByDateTool = langchainTool(
  async (params): Promise<string> => {
    const { start_date, end_date, limit, offset } = params as z.infer<typeof TransactionHistoryByDateParams>;
    return executeGetTransactionHistoryByDate(start_date, end_date, limit, offset);
  },
  {
    name: 'transactionHistoryByDateTool',
    description: '按日期范围查询账户的交易历史记录',
    schema: TransactionHistoryByDateParams,
  },
);

export const accountBalanceTool = langchainTool(
  async (params): Promise<string> => {
    const { before_transaction_id } = params as z.infer<typeof AccountBalanceParams>;
    return executeGetAccountBalance(before_transaction_id);
  },
  {
    name: 'accountBalanceTool',
    description: '获取账户当前余额（直接读取账户资金字段）',
    schema: AccountBalanceParams,
  },
);

export const transactionSummaryTool = langchainTool(
  async (params): Promise<string> => {
    const { limit } = params as z.infer<typeof TransactionSummaryParams>;
    return executeGetTransactionSummary(limit);
  },
  {
    name: 'transactionSummaryTool',
    description: '获取账户交易记录的 Markdown 格式摘要',
    schema: TransactionSummaryParams,
  },
);

export const addTransactionTool = langchainTool(
  async (params): Promise<string> => {
    return executeAddTransaction(params as z.infer<typeof AddTransactionParams>);
  },
  {
    name: 'addTransactionTool',
    description: '添加交易记录（存款、取款、买入、卖出）',
    schema: AddTransactionParams,
  },
);

// ============== Claude Tools ==============

export const transactionHistoryClaudeTool = claudeTool(
  'transactionHistoryTool',
  '获取账户的交易历史记录，包括存款、取款、买入、卖出等',
  {
    limit: z.number().optional().describe('返回记录数量限制（默认 50）'),
    offset: z.number().optional().describe('偏移量（用于分页，默认 0）'),
  },
  async (args) => {
    try {
      const result = await executeGetTransactionHistory(
        args.limit as number | undefined,
        args.offset as number | undefined,
      );
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[transactionHistoryClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `交易历史查询失败: ${errorMsg}` }], isError: true };
    }
  }
);

export const transactionHistoryByDateClaudeTool = claudeTool(
  'transactionHistoryByDateTool',
  '按日期范围查询账户的交易历史记录',
  {
    start_date: z.string().describe('开始日期（YYYY-MM-DD 格式）'),
    end_date: z.string().describe('结束日期（YYYY-MM-DD 格式）'),
    limit: z.number().optional().describe('返回记录数量限制'),
    offset: z.number().optional().describe('偏移量（用于分页）'),
  },
  async (args) => {
    try {
      const result = await executeGetTransactionHistoryByDate(
        String(args.start_date),
        String(args.end_date),
        args.limit as number | undefined,
        args.offset as number | undefined,
      );
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[transactionHistoryByDateClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `按日期查询交易历史失败: ${errorMsg}` }], isError: true };
    }
  }
);

export const accountBalanceClaudeTool = claudeTool(
  'accountBalanceTool',
  '获取账户当前余额（直接读取账户资金字段）',
  {
    before_transaction_id: z.string().optional().describe('计算到指定交易之前的余额'),
  },
  async (args) => {
    try {
      const result = await executeGetAccountBalance(
        args.before_transaction_id as string | undefined,
      );
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[accountBalanceClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `账户余额查询失败: ${errorMsg}` }], isError: true };
    }
  }
);

export const transactionSummaryClaudeTool = claudeTool(
  'transactionSummaryTool',
  '获取账户交易记录的 Markdown 格式摘要',
  {
    limit: z.number().optional().describe('记录数量限制（默认 50）'),
  },
  async (args) => {
    try {
      const result = await executeGetTransactionSummary(args.limit as number | undefined);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[transactionSummaryClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `交易摘要查询失败: ${errorMsg}` }], isError: true };
    }
  }
);

export const addTransactionClaudeTool = claudeTool(
  'addTransactionTool',
  '添加交易记录（存款、取款、买入、卖出）',
  {
    account_id: z.string().describe('账户 ID'),
    type: z.enum(['deposit', 'withdrawal', 'buy', 'sell']).describe('交易类型'),
    amount: z.number().optional().describe('金额（存款/取款时必填）'),
    sector: z.enum(['stock', 'etf', 'fund', 'crypto']).optional().describe('资产类型，默认 stock'),
    market: z.enum(['US', 'CN', 'HK']).optional().describe('市场'),
    symbol: z.string().optional().describe('股票代码（买入/卖出时必填）'),
    quantity: z.number().optional().describe('数量（买入/卖出时必填）'),
    price: z.number().optional().describe('价格（买入/卖出时必填）'),
    description: z.string().optional().describe('交易描述'),
    trade_time: z.string().optional().describe('交易时间（ISO 格式）'),
  },
  async (args) => {
    try {
      const result = await executeAddTransaction(args);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[addTransactionClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `交易记录创建失败: ${errorMsg}` }], isError: true };
    }
  }
);
