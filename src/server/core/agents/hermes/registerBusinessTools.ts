/**
 * Register business-specific tools with a Hermes ToolRegistry.
 *
 * Bridges the project's existing business tools into the Hermes Agent tool format,
 * delegating all execution logic to the framework-agnostic business/ layer.
 */

import { Type, type TextContent, type ToolRegistry } from '@investment-agent/hermes-agent';
import {
  fetchStockPrice,
  fetchStockMarketInfo,
  fetchStockCompanyInfo,
  tavilySearch,
  searchNotes,
  queryDb,
} from '@server/core/business';
import logger from '@server/base/logger';

type HandlerResult = { content: TextContent[]; isError?: boolean };

// ============== Schemas ==============

const stockGetPriceSchema = Type.Object({
  stock_code: Type.String({ description: '股票代码，如 AAPL, 600519, 0700.HK' }),
  start_date: Type.Optional(Type.String({ description: '开始日期 (YYYY-MM-DD)，默认30天前' })),
  end_date: Type.Optional(Type.String({ description: '结束日期 (YYYY-MM-DD)，默认今天' })),
});

const stockMarketInfoSchema = Type.Object({
  symbol: Type.String({ description: '资产代号（股票、ETF等）' }),
});

const stockCompanyInfoSchema = Type.Object({
  symbol: Type.String({ description: '资产代号（股票、ETF等）' }),
});

const stockNewsSchema = Type.Object({
  symbol: Type.String({ description: '资产代号（股票、ETF等）' }),
});

const noteQuerySchema = Type.Object({
  query: Type.String({ description: '笔记搜索关键词' }),
});

const tavilySearchSchema = Type.Object({
  query: Type.String({ description: '搜索关键词' }),
});

const dbQuerySchema = Type.Object({
  table: Type.String({ description: '数据库表名，如: notes, transactions, asset_positions, accounts' }),
  whereColumn: Type.Optional(Type.String({ description: '查询条件的列名' })),
  whereValue: Type.Optional(Type.String({ description: '查询条件的值' })),
  orderBy: Type.Optional(Type.String({ description: '排序字段（蛇形命名）' })),
  orderDirection: Type.Optional(Type.String({ description: 'ASC 或 DESC，默认 DESC' })),
  limit: Type.Optional(Type.Number({ description: '返回数量，默认10，最多100' })),
});

// ============== Tool Names ==============

export type BusinessToolName =
  | 'stock_get_price'
  | 'stock_market_info'
  | 'stock_company_info'
  | 'stock_search_news'
  | 'note_query'
  | 'tavily_search'
  | 'db_query';

export interface BusinessToolsConfig {
  enable?: BusinessToolName[];
}

// ============== Registration ==============

export function registerBusinessTools(
  registry: ToolRegistry,
  config: BusinessToolsConfig = {},
): void {
  const enabled = config.enable
    ? new Set(config.enable)
    : new Set<BusinessToolName>([
        'stock_get_price',
        'stock_market_info',
        'stock_company_info',
        'stock_search_news',
        'note_query',
        'tavily_search',
        'db_query',
      ]);

  const wrap =
    (fn: () => Promise<string>) =>
    async (): Promise<HandlerResult> => {
      try {
        return { content: [{ type: 'text', text: await fn() }] };
      } catch (e) {
        return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
      }
    };

  if (enabled.has('stock_get_price')) {
    registry.register(
      'stock_get_price',
      '获取股票价格数据（支持美股、A股、港股）。根据代码自动识别市场。',
      stockGetPriceSchema,
      async (_id, args) =>
        wrap(async () =>
          fetchStockPrice(String(args.stock_code), String(args.start_date), String(args.end_date)),
        )(),
    );
  }

  if (enabled.has('stock_market_info')) {
    registry.register(
      'stock_market_info',
      '查询资产的市场分析信息（评级、财报分析、投资笔记）',
      stockMarketInfoSchema,
      async (_id, args) =>
        wrap(async () => fetchStockMarketInfo(String(args.symbol)))(),
    );
  }

  if (enabled.has('stock_company_info')) {
    registry.register(
      'stock_company_info',
      '查询公司基本信息（行业、市值、简介等）',
      stockCompanyInfoSchema,
      async (_id, args) =>
        wrap(async () => fetchStockCompanyInfo(String(args.symbol)))(),
    );
  }

  if (enabled.has('stock_search_news')) {
    registry.register(
      'stock_search_news',
      '搜索股票相关新闻和资讯',
      stockNewsSchema,
      async (_id, args) =>
        wrap(async () =>
          tavilySearch(`${args.symbol} stock news latest`),
        )(),
    );
  }

  if (enabled.has('note_query')) {
    registry.register(
      'note_query',
      '查询投资笔记（公司分析、行业研究、投资重点等）',
      noteQuerySchema,
      async (_id, args) =>
        wrap(async () => searchNotes(String(args.query)))(),
    );
  }

  if (enabled.has('tavily_search')) {
    registry.register(
      'tavily_search',
      '搜索互联网最新信息（新闻、文章、数据等）',
      tavilySearchSchema,
      async (_id, args) =>
        wrap(async () => tavilySearch(String(args.query)))(),
    );
  }

  if (enabled.has('db_query')) {
    registry.register(
      'db_query',
      `查询本地数据库。可查询的表: notes, transactions, asset_positions, accounts, asset_meta, asset_market_info, analysis_reports, portfolio_snapshots, chat_sessions, model_providers。
示例: {"table": "transactions", "orderBy": "created_at", "limit": 10}`,
      dbQuerySchema,
      async (_id, args) =>
        wrap(async () =>
          queryDb({
            table: String(args.table),
            whereColumn: args.whereColumn ? String(args.whereColumn) : undefined,
            whereValue: args.whereValue ? String(args.whereValue) : undefined,
            orderBy: args.orderBy ? String(args.orderBy) : undefined,
            orderDirection: (String(args.orderDirection ?? 'DESC').toUpperCase() as 'ASC' | 'DESC') || 'DESC',
            limit: Math.min(100, Math.max(1, Number(args.limit ?? 10))),
          }),
        )(),
    );
  }
}
