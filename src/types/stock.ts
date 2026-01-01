import { z } from 'zod';

/**
 * 股票分析请求参数类型
 */
export const StockAnalysisRequestSchema = z.object({
  stockSymbol: z.string().min(1, '股票代码不能为空'), // 股票代码
  analysisDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'), // 分析日期
  analysts: z.array(z.string()), // 分析师列表
  researchDepth: z.number().min(1).max(10).default(3), // 研究深度
  llmProvider: z.enum(['dashsscope', 'deepseek', 'google', 'ant']).default('ant'), // LLM提供商
  llmModel: z.string().default('Kimi-K2-Instruct'), // LM 大模型名称
  marketType: z.enum(['美股', '港股', 'A股']).default('美股'),
});

export type StockAnalysisRequestType = z.infer<typeof StockAnalysisRequestSchema>;

/**
 * 股票分析响应结果类型
 */
export const StockAnalysisResultSchema = z.object({
  stock_symbol: z.string(),
  analysis_date: z.string(),
  analysts: z.array(z.string()),
  state: z.any(),
  decision: z.any(),
  success: z.boolean(),
  error: z.string().nullable(),
  sessionId: z.string(),
  suggestion: z.string().optional(),
});

export type StockAnalysisResult = z.infer<typeof StockAnalysisResultSchema>;

export const StockMarket = {
  CHINA_A: 'china_a',
  HONG_KONG: 'hong_kong',
  US: 'us',
  UNKNOWN: 'unknown',
} as const;

export type StockMarket = (typeof StockMarket)[keyof typeof StockMarket];

export type StockAnalyst =
  | 'Market_Analyst'
  | 'Bull_Researcher'
  | 'Bear_Researcher'
  | 'Research_Manager'
  | 'Trader'
  | 'Risky_Analyst'
  | 'Safe_Analyst'
  | 'Risk_Judge'
  | 'Neutral_Analyst'
  | 'Trade_Decision_Maker';
