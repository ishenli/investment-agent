import logger from '@server/base/logger';
import {
  getTransactionHistory,
  getTransactionHistoryByDateRange,
  getAccountBalance,
  getTransactionSummary,
  addTransaction,
} from '@server/core/business';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import { Type, type TObject } from '@sinclair/typebox';
import z from 'zod';

import type { HermesToolConfig } from './types';

// ============== Core Logic ==============

async function executeGetTransactionHistory(limit?: number, offset?: number): Promise<string> {
  try {
    return await getTransactionHistory('', limit, offset);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[TransactionHistoryTool] query failed:`, error);
    return `交易历史查询失败: ${errorMsg}`;
  }
}

async function executeGetTransactionHistoryByDate(startDate: string, endDate: string, limit?: number, offset?: number): Promise<string> {
  try {
    return await getTransactionHistoryByDateRange('', startDate, endDate, limit, offset);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[TransactionHistoryByDateTool] query failed:`, error);
    return `按日期查询交易历史失败: ${errorMsg}`;
  }
}

async function executeGetAccountBalance(beforeTransactionId?: string): Promise<string> {
  try {
    return await getAccountBalance('', beforeTransactionId);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[AccountBalanceTool] query failed:`, error);
    return `账户余额查询失败: ${errorMsg}`;
  }
}

async function executeGetTransactionSummary(limit?: number): Promise<string> {
  try {
    return await getTransactionSummary('', limit);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[TransactionSummaryTool] query failed:`, error);
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
    logger.error(`[AddTransactionTool] failed:`, error);
    return `交易记录创建失败: ${errorMsg}`;
  }
}

// ============== Claude Agent SDK Adapters ==============

export const transactionHistoryClaudeTool = claudeTool(
  'transactionHistoryTool',
  '获取账户的交易历史记录，包括存款、取款、买入、卖出等',
  {
    limit: z.number().optional().describe('返回记录数量限制（默认 50）'),
    offset: z.number().optional().describe('偏移量（用于分页，默认 0）'),
  },
  async (args) => {
    try {
      const result = await executeGetTransactionHistory(args.limit as number | undefined, args.offset as number | undefined);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[transactionHistoryClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `交易历史查询失败: ${errorMsg}` }], isError: true };
    }
  },
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
  },
);

export const accountBalanceClaudeTool = claudeTool(
  'accountBalanceTool',
  '获取账户当前余额（直接读取账户资金字段）',
  {
    before_transaction_id: z.string().optional().describe('计算到指定交易之前的余额'),
  },
  async (args) => {
    try {
      const result = await executeGetAccountBalance(args.before_transaction_id as string | undefined);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[accountBalanceClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `账户余额查询失败: ${errorMsg}` }], isError: true };
    }
  },
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
  },
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
  },
);

// ============== Hermes Adapters ==============

const transactionHistorySchema: TObject = Type.Object({
  limit: Type.Optional(Type.Number({ description: '返回记录数量限制（默认 50）' })),
  offset: Type.Optional(Type.Number({ description: '偏移量（用于分页，默认 0）' })),
});

export const transactionHistoryHermesConfig: HermesToolConfig = {
  name: 'transaction_history',
  description: '获取账户的交易历史记录，包括存款、取款、买入、卖出等',
  schema: transactionHistorySchema,
  handler: async (_id, args) => {
    try {
      const result = await executeGetTransactionHistory(args.limit ? Number(args.limit) : undefined, args.offset ? Number(args.offset) : undefined);
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};

const transactionHistoryByDateSchema: TObject = Type.Object({
  start_date: Type.String({ description: '开始日期（YYYY-MM-DD 格式）' }),
  end_date: Type.String({ description: '结束日期（YYYY-MM-DD 格式）' }),
  limit: Type.Optional(Type.Number({ description: '返回记录数量限制' })),
  offset: Type.Optional(Type.Number({ description: '偏移量（用于分页）' })),
});

export const transactionHistoryByDateHermesConfig: HermesToolConfig = {
  name: 'transaction_history_by_date',
  description: '按日期范围查询账户的交易历史记录',
  schema: transactionHistoryByDateSchema,
  handler: async (_id, args) => {
    try {
      const result = await executeGetTransactionHistoryByDate(
        String(args.start_date),
        String(args.end_date),
        args.limit ? Number(args.limit) : undefined,
        args.offset ? Number(args.offset) : undefined,
      );
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};

const accountBalanceSchema: TObject = Type.Object({
  before_transaction_id: Type.Optional(Type.String({ description: '计算到指定交易之前的余额' })),
});

export const accountBalanceHermesConfig: HermesToolConfig = {
  name: 'account_balance',
  description: '获取账户当前余额（直接读取账户资金字段）',
  schema: accountBalanceSchema,
  handler: async (_id, args) => {
    try {
      const result = await executeGetAccountBalance(args.before_transaction_id ? String(args.before_transaction_id) : undefined);
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};

const transactionSummarySchema: TObject = Type.Object({
  limit: Type.Optional(Type.Number({ description: '记录数量限制（默认 50）' })),
});

export const transactionSummaryHermesConfig: HermesToolConfig = {
  name: 'transaction_summary',
  description: '获取账户交易记录的 Markdown 格式摘要',
  schema: transactionSummarySchema,
  handler: async (_id, args) => {
    try {
      const result = await executeGetTransactionSummary(args.limit ? Number(args.limit) : undefined);
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};

const addTransactionSchema: TObject = Type.Object({
  account_id: Type.String({ description: '账户 ID' }),
  type: Type.String({ description: '交易类型: deposit | withdrawal | buy | sell' }),
  amount: Type.Optional(Type.Number({ description: '金额（存款/取款时必填）' })),
  sector: Type.Optional(Type.String({ description: '资产类型: stock | etf | fund | crypto，默认 stock' })),
  market: Type.Optional(Type.String({ description: '市场: US | CN | HK' })),
  symbol: Type.Optional(Type.String({ description: '股票代码（买入/卖出时必填）' })),
  quantity: Type.Optional(Type.Number({ description: '数量（买入/卖出时必填）' })),
  price: Type.Optional(Type.Number({ description: '价格（买入/卖出时必填）' })),
  description: Type.Optional(Type.String({ description: '交易描述' })),
  trade_time: Type.Optional(Type.String({ description: '交易时间（ISO 格式）' })),
});

export const addTransactionHermesConfig: HermesToolConfig = {
  name: 'add_transaction',
  description: '添加交易记录（存款、取款、买入、卖出）',
  schema: addTransactionSchema,
  handler: async (_id, args) => {
    try {
      const result = await executeAddTransaction({
        account_id: String(args.account_id),
        type: String(args.type) as 'deposit' | 'withdrawal' | 'buy' | 'sell',
        amount: args.amount ? Number(args.amount) : undefined,
        sector: args.sector ? String(args.sector) as 'stock' | 'etf' | 'fund' | 'crypto' : undefined,
        market: args.market ? String(args.market) as 'US' | 'CN' | 'HK' : undefined,
        symbol: args.symbol ? String(args.symbol) : undefined,
        quantity: args.quantity ? Number(args.quantity) : undefined,
        price: args.price ? Number(args.price) : undefined,
        description: args.description ? String(args.description) : undefined,
        trade_time: args.trade_time ? String(args.trade_time) : undefined,
      });
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'finance',
};