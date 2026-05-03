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
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
  queryDb,
  getTransactionHistory,
  getTransactionHistoryByDateRange,
  getAccountBalance,
  getTransactionSummary,
  addTransaction,
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

const noteCreateSchema = Type.Object({
  title: Type.String({ description: '笔记标题' }),
  content: Type.String({ description: '笔记内容' }),
  tags: Type.Optional(Type.Array(Type.String(), { description: '标签列表' })),
});

const noteListSchema = Type.Object({
  limit: Type.Optional(Type.Number({ description: '每页数量，默认20' })),
  offset: Type.Optional(Type.Number({ description: '偏移量，默认0' })),
  search: Type.Optional(Type.String({ description: '搜索关键词（标题或内容）' })),
  tag: Type.Optional(Type.String({ description: '按标签过滤' })),
  sort_by: Type.Optional(Type.String({ description: '排序字段: createdAt | updatedAt | title，默认 createdAt' })),
  sort_order: Type.Optional(Type.String({ description: '排序方向: asc | desc，默认 desc' })),
});

const noteGetSchema = Type.Object({
  note_id: Type.String({ description: '笔记ID' }),
});

const noteUpdateSchema = Type.Object({
  note_id: Type.String({ description: '笔记ID' }),
  title: Type.Optional(Type.String({ description: '新标题' })),
  content: Type.Optional(Type.String({ description: '新内容' })),
  tags: Type.Optional(Type.Array(Type.String(), { description: '新标签列表' })),
});

const noteDeleteSchema = Type.Object({
  note_id: Type.String({ description: '笔记ID' }),
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

// Transaction Schemas
const transactionHistorySchema = Type.Object({
  account_id: Type.String({ description: '账户 ID' }),
  limit: Type.Optional(Type.Number({ description: '返回记录数量限制（默认 50）' })),
  offset: Type.Optional(Type.Number({ description: '偏移量（用于分页，默认 0）' })),
});

const transactionHistoryByDateSchema = Type.Object({
  account_id: Type.String({ description: '账户 ID' }),
  start_date: Type.String({ description: '开始日期（YYYY-MM-DD 格式）' }),
  end_date: Type.String({ description: '结束日期（YYYY-MM-DD 格式）' }),
  limit: Type.Optional(Type.Number({ description: '返回记录数量限制' })),
  offset: Type.Optional(Type.Number({ description: '偏移量（用于分页）' })),
});

const accountBalanceSchema = Type.Object({
  account_id: Type.String({ description: '账户 ID' }),
  before_transaction_id: Type.Optional(Type.String({ description: '计算到指定交易之前的余额' })),
});

const transactionSummarySchema = Type.Object({
  account_id: Type.String({ description: '账户 ID' }),
  limit: Type.Optional(Type.Number({ description: '记录数量限制（默认 50）' })),
});

const addTransactionSchema = Type.Object({
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

// ============== Tool Names ==============

export type BusinessToolName =
  | 'stock_get_price'
  | 'stock_market_info'
  | 'stock_company_info'
  | 'stock_search_news'
  | 'note_query'
  | 'note_create'
  | 'note_list'
  | 'note_get'
  | 'note_update'
  | 'note_delete'
  | 'tavily_search'
  | 'db_query'
  | 'transaction_history'
  | 'transaction_history_by_date'
  | 'account_balance'
  | 'transaction_summary'
  | 'add_transaction';

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
        'note_create',
        'note_list',
        'note_get',
        'note_update',
        'note_delete',
        'tavily_search',
        'db_query',
        'transaction_history',
        'transaction_history_by_date',
        'account_balance',
        'transaction_summary',
        'add_transaction',
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

  if (enabled.has('note_create')) {
    registry.register(
      'note_create',
      '创建新的投资笔记',
      noteCreateSchema,
      async (_id, args) =>
        wrap(async () =>
          createNote(String(args.title), String(args.content), (args.tags as string[]) ?? undefined),
        )(),
    );
  }

  if (enabled.has('note_list')) {
    registry.register(
      'note_list',
      '列出当前用户的投资笔记（支持分页、搜索、标签过滤）',
      noteListSchema,
      async (_id, args) =>
        wrap(async () =>
          listNotes(
            args.limit ? Number(args.limit) : undefined,
            args.offset ? Number(args.offset) : undefined,
            args.search ? String(args.search) : undefined,
            args.tag ? String(args.tag) : undefined,
            args.sort_by ? String(args.sort_by) as 'createdAt' | 'updatedAt' | 'title' : undefined,
            args.sort_order ? String(args.sort_order) as 'asc' | 'desc' : undefined,
          ),
        )(),
    );
  }

  if (enabled.has('note_get')) {
    registry.register(
      'note_get',
      '获取单条投资笔记的完整内容',
      noteGetSchema,
      async (_id, args) =>
        wrap(async () => getNote(String(args.note_id)))(),
    );
  }

  if (enabled.has('note_update')) {
    registry.register(
      'note_update',
      '更新投资笔记的标题、内容或标签',
      noteUpdateSchema,
      async (_id, args) =>
        wrap(async () =>
          updateNote(
            String(args.note_id),
            args.title !== undefined ? String(args.title) : undefined,
            args.content !== undefined ? String(args.content) : undefined,
            args.tags !== undefined ? (args.tags as string[]) : undefined,
          ),
        )(),
    );
  }

  if (enabled.has('note_delete')) {
    registry.register(
      'note_delete',
      '删除投资笔记',
      noteDeleteSchema,
      async (_id, args) =>
        wrap(async () => deleteNote(String(args.note_id)))(),
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

  // Transaction tools
  if (enabled.has('transaction_history')) {
    registry.register(
      'transaction_history',
      '获取账户的交易历史记录，包括存款、取款、买入、卖出等',
      transactionHistorySchema,
      async (_id, args) =>
        wrap(async () =>
          getTransactionHistory(
            String(args.account_id),
            args.limit ? Number(args.limit) : undefined,
            args.offset ? Number(args.offset) : undefined,
          ),
        )(),
    );
  }

  if (enabled.has('transaction_history_by_date')) {
    registry.register(
      'transaction_history_by_date',
      '按日期范围查询账户的交易历史记录',
      transactionHistoryByDateSchema,
      async (_id, args) =>
        wrap(async () =>
          getTransactionHistoryByDateRange(
            String(args.account_id),
            String(args.start_date),
            String(args.end_date),
            args.limit ? Number(args.limit) : undefined,
            args.offset ? Number(args.offset) : undefined,
          ),
        )(),
    );
  }

  if (enabled.has('account_balance')) {
    registry.register(
      'account_balance',
      '获取账户当前余额（基于交易记录计算）',
      accountBalanceSchema,
      async (_id, args) =>
        wrap(async () =>
          getAccountBalance(
            String(args.account_id),
            args.before_transaction_id ? String(args.before_transaction_id) : undefined,
          ),
        )(),
    );
  }

  if (enabled.has('transaction_summary')) {
    registry.register(
      'transaction_summary',
      '获取账户交易记录的 Markdown 格式摘要',
      transactionSummarySchema,
      async (_id, args) =>
        wrap(async () =>
          getTransactionSummary(
            String(args.account_id),
            args.limit ? Number(args.limit) : undefined,
          ),
        )(),
    );
  }

  if (enabled.has('add_transaction')) {
    registry.register(
      'add_transaction',
      '添加交易记录（存款、取款、买入、卖出）',
      addTransactionSchema,
      async (_id, args) =>
        wrap(async () =>
          addTransaction({
            accountId: String(args.account_id),
            type: String(args.type) as 'deposit' | 'withdrawal' | 'buy' | 'sell',
            amount: args.amount ? Number(args.amount) : undefined,
            sector: args.sector ? String(args.sector) as 'stock' | 'etf' | 'fund' | 'crypto' : undefined,
            market: args.market ? String(args.market) as 'US' | 'CN' | 'HK' : undefined,
            symbol: args.symbol ? String(args.symbol) : undefined,
            quantity: args.quantity ? Number(args.quantity) : undefined,
            price: args.price ? Number(args.price) : undefined,
            description: args.description ? String(args.description) : undefined,
            tradeTime: args.trade_time ? String(args.trade_time) : undefined,
          }),
        )(),
    );
  }
}
