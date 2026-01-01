import z, { symbol } from 'zod';

export type TransactionType = 'deposit' | 'withdrawal' | 'buy' | 'sell';

export const TransactionRequestSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'buy', 'sell']),
  amount: z.number(), // 存款和取款的提交数字
  quantity: z.number().optional(),
  price: z.number().optional(), // 购买的资产价格，美元计价
  description: z.string().optional(),
  symbol: z.string().optional(),
  market: z.enum(['US', 'CN', 'HK']).optional(),
  tradeTime: z
    .string()
    .datetime() // 确保是合法的 ISO 8601 日期时间字符串
    .transform((str) => new Date(str)), // 转为 Date 对象
  sector: z.enum(['stock', 'etf', 'fund', 'crypto']).default('stock'),
});

export type TransactionRequestType = z.infer<typeof TransactionRequestSchema>;

export const PartialTransactionRequestSchema = TransactionRequestSchema.partial();

export type PartialTransactionRequestType = z.infer<typeof PartialTransactionRequestSchema>;
/**
 * Transaction Record Schema
 */

export const TransactionRecordBaseSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'buy', 'sell']),
  amount: z.number(),
  accountId: z.string().optional(),
  symbol: z.string().optional(),
  quantity: z.number().optional(),
  price: z.number().optional(),
  description: z.string().optional(),
  sector: z.string().optional(),
  market: z.enum(['US', 'CN', 'HK']).optional(),
});

export const TransactionRecordSchema = TransactionRecordBaseSchema.extend({
  id: z.string(),
  referenceId: z.string().optional(),
  tradeTime: z.date().optional().nullable(),
  createdAt: z.date().optional(),
});

export type TransactionRecordBaseType = z.infer<typeof TransactionRecordBaseSchema>;

export type TransactionRecordType = z.infer<typeof TransactionRecordSchema>;
