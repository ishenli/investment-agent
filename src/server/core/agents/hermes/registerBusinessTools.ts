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
  queryPortfolio,
  createAssetMeta,
  updateAssetMeta,
  createTaskBiz,
  listTasksBiz,
  updateTaskBiz,
} from '@server/core/business';
import { MarketBizController } from '@server/controller/market';
import { ReportController } from '@server/controller/report';
import { ReportDetailController } from '@server/controller/reportDetail';

type HandlerResult = { content: TextContent[]; isError?: boolean };

// ============== Controller Helper ==============

const unwrap = (result: any): string => {
  if (!result || typeof result !== 'object') {
    throw new Error('Controller returned invalid response');
  }
  if (!result.success) {
    const msg = typeof result.message === 'string' ? result.message : JSON.stringify(result.message);
    throw new Error(`${result.code ?? 'CONTROLLER_ERROR'}: ${msg}`);
  }
  return JSON.stringify(result.data ?? result);
};

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
  limit: Type.Optional(Type.Number({ description: '返回记录数量限制（默认 50）' })),
  offset: Type.Optional(Type.Number({ description: '偏移量（用于分页，默认 0）' })),
});

const transactionHistoryByDateSchema = Type.Object({
  start_date: Type.String({ description: '开始日期（YYYY-MM-DD 格式）' }),
  end_date: Type.String({ description: '结束日期（YYYY-MM-DD 格式）' }),
  limit: Type.Optional(Type.Number({ description: '返回记录数量限制' })),
  offset: Type.Optional(Type.Number({ description: '偏移量（用于分页）' })),
});

const accountBalanceSchema = Type.Object({
  before_transaction_id: Type.Optional(Type.String({ description: '计算到指定交易之前的余额' })),
});

const transactionSummarySchema = Type.Object({
  limit: Type.Optional(Type.Number({ description: '记录数量限制（默认 50）' })),
});

const portfolioQuerySchema = Type.Object({});

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

// Asset Market Info Schemas
const assetMarketInfoListSchema = Type.Object({
  asset_meta_id: Type.String({ description: '资产元数据 ID' }),
  page: Type.Optional(Type.String({ description: '页码，默认 1' })),
  limit: Type.Optional(Type.String({ description: '每页数量，默认 10' })),
});

const assetMarketInfoLatestSchema = Type.Object({
  asset_meta_id: Type.String({ description: '资产元数据 ID' }),
});

const assetMarketInfoDetailSchema = Type.Object({
  id: Type.String({ description: '市场信息记录 ID' }),
});

const assetMarketInfoSaveSchema = Type.Object({
  asset_meta_ids: Type.Array(Type.Number(), { description: '关联的资产元数据 IDs' }),
  title: Type.String({ description: '标题' }),
  symbol: Type.String({ description: '资产代号' }),
  sentiment: Type.String({ description: '情绪评级' }),
  importance: Type.String({ description: '重要性' }),
  summary: Type.String({ description: '摘要' }),
  key_topics: Type.Optional(Type.String({ description: '关键主题' })),
  market_impact: Type.String({ description: '市场影响' }),
  key_data_points: Type.Optional(Type.String({ description: '关键数据点' })),
  source_url: Type.Optional(Type.String({ description: '来源 URL' })),
  source_name: Type.Optional(Type.String({ description: '来源名称' })),
  original_content: Type.Optional(Type.String({ description: '原始内容' })),
  content_mode: Type.Optional(Type.String({ description: '内容模式: ai_summary | original，默认 ai_summary' })),
  market_info_id: Type.Optional(Type.String({ description: '用于获取原文内容的市场信息 ID' })),
});

const assetMarketInfoUpdateSchema = Type.Object({
  id: Type.String({ description: '市场信息记录 ID' }),
  asset_meta_ids: Type.Optional(Type.Array(Type.Number(), { description: '关联的资产元数据 IDs' })),
  title: Type.Optional(Type.String({ description: '标题' })),
  symbol: Type.Optional(Type.String({ description: '资产代号' })),
  sentiment: Type.Optional(Type.String({ description: '情绪评级' })),
  importance: Type.Optional(Type.String({ description: '重要性' })),
  summary: Type.Optional(Type.String({ description: '摘要' })),
  key_topics: Type.Optional(Type.String({ description: '关键主题' })),
  market_impact: Type.Optional(Type.String({ description: '市场影响' })),
  key_data_points: Type.Optional(Type.String({ description: '关键数据点' })),
  source_url: Type.Optional(Type.String({ description: '来源 URL' })),
  source_name: Type.Optional(Type.String({ description: '来源名称' })),
  original_content: Type.Optional(Type.String({ description: '原始内容' })),
  content_mode: Type.Optional(Type.String({ description: '内容模式: ai_summary | original' })),
});

const assetMarketInfoDeleteSchema = Type.Object({
  id: Type.String({ description: '市场信息记录 ID' }),
});

// Report Schemas
const reportListSchema = Type.Object({
  account_id: Type.Optional(Type.String({ description: '账户 ID（可选）' })),
  type: Type.Optional(Type.String({ description: '报告类型: weekly | monthly | emergency' })),
  limit: Type.Optional(Type.String({ description: '返回数量，默认 20' })),
  offset: Type.Optional(Type.String({ description: '偏移量，默认 0' })),
});

const reportDetailSchema = Type.Object({
  report_id: Type.String({ description: '报告 ID' }),
});

const assetMetaCreateSchema = Type.Object({
  symbol: Type.String({ description: '资产代号（股票代码）' }),
  priceCents: Type.Number({ description: '价格（单位：分）' }),
  assetType: Type.Union([Type.Literal('stock'), Type.Literal('etf'), Type.Literal('fund'), Type.Literal('crypto')], { description: '资产类型' }),
  currency: Type.String({ description: '货币代码，如 CNY, USD, HKD' }),
  source: Type.String({ description: '数据来源标识' }),
  market: Type.Union([Type.Literal('CN'), Type.Literal('US'), Type.Literal('HK')], { description: '市场' }),
  chineseName: Type.Optional(Type.String({ description: '中文名称' })),
  fullName: Type.Optional(Type.String({ description: '完整名称' })),
  logoUrl: Type.Optional(Type.String({ description: 'Logo URL' })),
  investmentMemo: Type.Optional(Type.String({ description: '投资备忘录' })),
});

const assetMetaUpdateSchema = Type.Object({
  id: Type.Number({ description: '资产元数据 ID' }),
  symbol: Type.Optional(Type.String({ description: '资产代号（股票代码）' })),
  priceCents: Type.Optional(Type.Number({ description: '价格（单位：分）' })),
  assetType: Type.Optional(Type.Union([Type.Literal('stock'), Type.Literal('etf'), Type.Literal('fund'), Type.Literal('crypto')], { description: '资产类型' })),
  currency: Type.Optional(Type.String({ description: '货币代码，如 CNY, USD, HKD' })),
  source: Type.Optional(Type.String({ description: '数据来源标识' })),
  market: Type.Optional(Type.Union([Type.Literal('CN'), Type.Literal('US'), Type.Literal('HK')], { description: '市场' })),
  chineseName: Type.Optional(Type.String({ description: '中文名称，传空字符串表示清空' })),
  fullName: Type.Optional(Type.String({ description: '完整名称，传空字符串表示清空' })),
  logoUrl: Type.Optional(Type.String({ description: 'Logo URL，传空字符串表示清空' })),
  investmentMemo: Type.Optional(Type.String({ description: '投资备忘录，传空字符串表示清空' })),
});

// Task Schemas
const taskCreateSchema = Type.Object({
  title: Type.String({ description: '任务标题' }),
  description: Type.Optional(Type.String({ description: '任务描述' })),
  type: Type.Optional(Type.String({ description: '任务类型: one_time | price_trigger | monitoring | date_driven，默认 one_time' })),
  priority: Type.Optional(Type.String({ description: '优先级: low | medium | high | urgent，默认 medium' })),
  linked_symbols: Type.Optional(Type.Array(Type.String(), { description: '关联资产代号列表，如 ["AAPL", "NVDA"]' })),
  due_date: Type.Optional(Type.String({ description: '截止日期 (YYYY-MM-DD 格式)' })),
  source_type: Type.Optional(Type.String({ description: '来源类型: manual | agent_chat | analysis_report，默认 agent_chat' })),
  source_id: Type.Optional(Type.String({ description: '来源ID（如聊天会话ID或报告ID）' })),
});

const taskListSchema = Type.Object({
  status: Type.Optional(Type.String({ description: '按状态过滤: pending | in_progress | completed | cancelled | expired' })),
  priority: Type.Optional(Type.String({ description: '按优先级过滤: low | medium | high | urgent' })),
  search: Type.Optional(Type.String({ description: '搜索关键词（标题或描述）' })),
  limit: Type.Optional(Type.Number({ description: '每页数量，默认20' })),
  offset: Type.Optional(Type.Number({ description: '偏移量，默认0' })),
});

const taskUpdateSchema = Type.Object({
  task_id: Type.String({ description: '任务ID' }),
  status: Type.Optional(Type.String({ description: '新状态: pending | in_progress | completed | cancelled' })),
  title: Type.Optional(Type.String({ description: '新标题' })),
  description: Type.Optional(Type.String({ description: '新描述' })),
  priority: Type.Optional(Type.String({ description: '新优先级: low | medium | high | urgent' })),
  execution_notes: Type.Optional(Type.String({ description: '执行备注（完成任务时记录执行结果）' })),
  linked_symbols: Type.Optional(Type.Array(Type.String(), { description: '关联资产代号列表' })),
});

// ============== Tool Names ==============

export type BusinessToolName =
  | 'stock_get_price'
  | 'stock_market_info'
  | 'stock_company_info'
  | 'stock_search_news'
  | 'asset_meta_create'
  | 'asset_meta_update'
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
  | 'add_transaction'
  | 'asset_market_info_list'
  | 'asset_market_info_latest'
  | 'asset_market_info_detail'
  | 'asset_market_info_save'
  | 'asset_market_info_update'
  | 'asset_market_info_delete'
  | 'report_list'
  | 'report_detail'
  | 'portfolio_query'
  | 'task_create'
  | 'task_list'
  | 'task_update';

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
        'asset_meta_create',
        'asset_meta_update',
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
        'asset_market_info_list',
        'asset_market_info_latest',
        'asset_market_info_detail',
        'asset_market_info_save',
        'asset_market_info_update',
        'asset_market_info_delete',
        'report_list',
        'report_detail',
        'portfolio_query',
        'task_create',
        'task_list',
        'task_update',
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
      'read',
    );
  }

  if (enabled.has('stock_market_info')) {
    registry.register(
      'stock_market_info',
      '查询资产的市场分析信息（评级、财报分析、投资笔记）',
      stockMarketInfoSchema,
      async (_id, args) =>
        wrap(async () => fetchStockMarketInfo(String(args.symbol)))(),
      'read',
    );
  }

  if (enabled.has('stock_company_info')) {
    registry.register(
      'stock_company_info',
      '查询公司基本信息（行业、市值、简介等）',
      stockCompanyInfoSchema,
      async (_id, args) =>
        wrap(async () => fetchStockCompanyInfo(String(args.symbol)))(),
      'read',
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
      'read',
    );
  }

  if (enabled.has('note_query')) {
    registry.register(
      'note_query',
      '查询投资笔记（公司分析、行业研究、投资重点等）',
      noteQuerySchema,
      async (_id, args) =>
        wrap(async () => searchNotes(String(args.query)))(),
      'read',
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
      'write',
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
      'read',
    );
  }

  if (enabled.has('note_get')) {
    registry.register(
      'note_get',
      '获取单条投资笔记的完整内容',
      noteGetSchema,
      async (_id, args) =>
        wrap(async () => getNote(String(args.note_id)))(),
      'read',
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
      'write',
    );
  }

  if (enabled.has('note_delete')) {
    registry.register(
      'note_delete',
      '删除投资笔记',
      noteDeleteSchema,
      async (_id, args) =>
        wrap(async () => deleteNote(String(args.note_id)))(),
      'system',
    );
  }

  if (enabled.has('tavily_search')) {
    registry.register(
      'tavily_search',
      '搜索互联网最新信息（新闻、文章、数据等）',
      tavilySearchSchema,
      async (_id, args) =>
        wrap(async () => tavilySearch(String(args.query)))(),
      'read',
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
      'read',
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
            '',
            args.limit ? Number(args.limit) : undefined,
            args.offset ? Number(args.offset) : undefined,
          ),
        )(),
      'read',
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
            '',
            String(args.start_date),
            String(args.end_date),
            args.limit ? Number(args.limit) : undefined,
            args.offset ? Number(args.offset) : undefined,
          ),
        )(),
      'read',
    );
  }

  if (enabled.has('account_balance')) {
    registry.register(
      'account_balance',
      '获取账户当前余额（直接读取账户资金字段）',
      accountBalanceSchema,
      async (_id, args) =>
        wrap(async () =>
          getAccountBalance(
            '',
            args.before_transaction_id ? String(args.before_transaction_id) : undefined,
          ),
        )(),
      'read',
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
            '',
            args.limit ? Number(args.limit) : undefined,
          ),
        )(),
      'read',
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
      'finance',
    );
  }

  // Asset Market Info Tools
  if (enabled.has('asset_market_info_list')) {
    registry.register(
      'asset_market_info_list',
      '获取指定资产的市场信息列表（本地数据库）',
      assetMarketInfoListSchema,
      async (_id, args) =>
        wrap(async () => {
          const controller = new MarketBizController();
          const result = await controller.getAssetMarketInfoList({
            assetMetaId: String(args.asset_meta_id),
            page: args.page ? String(args.page) : '1',
            limit: args.limit ? String(args.limit) : '10',
          });
          return unwrap(result);
        })(),
      'read',
    );
  }

  if (enabled.has('asset_market_info_latest')) {
    registry.register(
      'asset_market_info_latest',
      '获取指定资产的最新市场信息（本地数据库）',
      assetMarketInfoLatestSchema,
      async (_id, args) =>
        wrap(async () => {
          const controller = new MarketBizController();
          const result = await controller.getAssetMarketInfo({
            assetMetaId: String(args.asset_meta_id),
            type: 'latest',
          });
          return unwrap(result);
        })(),
      'read',
    );
  }

  if (enabled.has('asset_market_info_detail')) {
    registry.register(
      'asset_market_info_detail',
      '获取指定 ID 的市场信息详情',
      assetMarketInfoDetailSchema,
      async (_id, args) =>
        wrap(async () => {
          const controller = new MarketBizController();
          const result = await controller.getAssetMarketInfo({
            id: String(args.id),
            type: 'detail',
          });
          return unwrap(result);
        })(),
      'read',
    );
  }

  if (enabled.has('asset_market_info_save')) {
    registry.register(
      'asset_market_info_save',
      '保存新的市场信息到本地数据库',
      assetMarketInfoSaveSchema,
      async (_id, args) =>
        wrap(async () => {
          const controller = new MarketBizController();
          const result = await controller.saveMarketInfo({
            assetMetaIds: args.asset_meta_ids as number[],
            title: String(args.title),
            symbol: String(args.symbol),
            sentiment: String(args.sentiment),
            importance: String(args.importance),
            summary: String(args.summary),
            keyTopics: args.key_topics ? String(args.key_topics) : undefined,
            marketImpact: String(args.market_impact),
            keyDataPoints: args.key_data_points ? String(args.key_data_points) : undefined,
            sourceUrl: args.source_url ? String(args.source_url) : undefined,
            sourceName: args.source_name ? String(args.source_name) : undefined,
            originalContent: args.original_content ? String(args.original_content) : undefined,
            contentMode: args.content_mode
              ? (String(args.content_mode) as 'ai_summary' | 'original')
              : undefined,
            marketInfoId: args.market_info_id ? String(args.market_info_id) : undefined,
          });
          return unwrap(result);
        })(),
      'write',
    );
  }

  if (enabled.has('asset_market_info_update')) {
    registry.register(
      'asset_market_info_update',
      '更新指定 ID 的市场信息',
      assetMarketInfoUpdateSchema,
      async (_id, args) =>
        wrap(async () => {
          const controller = new MarketBizController();
          const body: any = { id: String(args.id) };
          if (args.asset_meta_ids !== undefined) body.assetMetaIds = args.asset_meta_ids;
          if (args.title !== undefined) body.title = String(args.title);
          if (args.symbol !== undefined) body.symbol = String(args.symbol);
          if (args.sentiment !== undefined) body.sentiment = String(args.sentiment);
          if (args.importance !== undefined) body.importance = String(args.importance);
          if (args.summary !== undefined) body.summary = String(args.summary);
          if (args.key_topics !== undefined) body.keyTopics = String(args.key_topics);
          if (args.market_impact !== undefined) body.marketImpact = String(args.market_impact);
          if (args.key_data_points !== undefined) body.keyDataPoints = String(args.key_data_points);
          if (args.source_url !== undefined) body.sourceUrl = String(args.source_url);
          if (args.source_name !== undefined) body.sourceName = String(args.source_name);
          if (args.original_content !== undefined) body.originalContent = String(args.original_content);
          if (args.content_mode !== undefined) body.contentMode = String(args.content_mode);
          const result = await controller.updateMarketInfo(body);
          return unwrap(result);
        })(),
      'write',
    );
  }

  if (enabled.has('asset_market_info_delete')) {
    registry.register(
      'asset_market_info_delete',
      '删除指定 ID 的市场信息',
      assetMarketInfoDeleteSchema,
      async (_id, args) =>
        wrap(async () => {
          const controller = new MarketBizController();
          const result = await controller.deleteMarketInfo({ id: String(args.id) });
          return unwrap(result);
        })(),
      'system',
    );
  }

  // Report Tools
  if (enabled.has('report_list')) {
    registry.register(
      'report_list',
      '获取报告列表（支持按类型过滤和分页）',
      reportListSchema,
      async (_id, args) =>
        wrap(async () => {
          const controller = new ReportController();
          const result = await controller.getReports({
            accountId: args.account_id ? String(args.account_id) : undefined,
            type: args.type
              ? (String(args.type) as 'weekly' | 'monthly' | 'emergency')
              : undefined,
            limit: args.limit ? String(args.limit) : undefined,
            offset: args.offset ? String(args.offset) : undefined,
          });
          return unwrap(result);
        })(),
      'read',
    );
  }

  if (enabled.has('report_detail')) {
    registry.register(
      'report_detail',
      '获取指定报告 ID 的详情',
      reportDetailSchema,
      async (_id, args) =>
        wrap(async () => {
          const controller = new ReportDetailController();
          const result = await controller.getReportDetail({
            reportId: String(args.report_id),
          });
          return unwrap(result);
        })(),
      'read',
    );
  }
    
  if (enabled.has('portfolio_query')) {
    registry.register(
      'portfolio_query',
      '查询用户投资组合概览（市值、持仓、盈亏、风险等级）。当用户询问持仓、资产、盈亏或风险时，优先调用此工具而非 db_query。',
      portfolioQuerySchema,
      async (_id, args) =>
        wrap(async () =>
          queryPortfolio(''),
        )(),
      'read',
    );
  }

  if (enabled.has('asset_meta_create')) {
    registry.register(
      'asset_meta_create',
      '创建新的资产元数据记录',
      assetMetaCreateSchema,
      async (_id, args) =>
        wrap(async () =>
          createAssetMeta({
            symbol: String(args.symbol),
            priceCents: Number(args.priceCents),
            assetType: String(args.assetType) as 'stock' | 'etf' | 'fund' | 'crypto',
            currency: String(args.currency),
            source: String(args.source),
            market: String(args.market) as 'CN' | 'US' | 'HK',
            chineseName: args.chineseName !== undefined ? String(args.chineseName) : null,
            fullName: args.fullName !== undefined ? String(args.fullName) : null,
            logoUrl: args.logoUrl !== undefined ? String(args.logoUrl) : null,
            investmentMemo: args.investmentMemo !== undefined ? String(args.investmentMemo) : null,
          }),
        )(),
    );
  }

  if (enabled.has('asset_meta_update')) {
    registry.register(
      'asset_meta_update',
      '更新已有的资产元数据记录',
      assetMetaUpdateSchema,
      async (_id, args) =>
        wrap(async () =>
          updateAssetMeta({
            id: Number(args.id),
            symbol: args.symbol !== undefined ? String(args.symbol) : undefined,
            priceCents: args.priceCents !== undefined ? Number(args.priceCents) : undefined,
            assetType: args.assetType !== undefined ? String(args.assetType) as 'stock' | 'etf' | 'fund' | 'crypto' : undefined,
            currency: args.currency !== undefined ? String(args.currency) : undefined,
            source: args.source !== undefined ? String(args.source) : undefined,
            market: args.market !== undefined ? String(args.market) as 'CN' | 'US' | 'HK' : undefined,
            chineseName: args.chineseName !== undefined ? String(args.chineseName) : undefined,
            fullName: args.fullName !== undefined ? String(args.fullName) : undefined,
            logoUrl: args.logoUrl !== undefined ? String(args.logoUrl) : undefined,
            investmentMemo: args.investmentMemo !== undefined ? String(args.investmentMemo) : undefined,
          }),
        )(),
    );
  }

  // Task Tools
  if (enabled.has('task_create')) {
    registry.register(
      'task_create',
      '创建投资任务（用于跟踪投资建议、监控条件等）',
      taskCreateSchema,
      async (_id, args) =>
        wrap(async () =>
          createTaskBiz(String(args.title), {
            description: args.description ? String(args.description) : undefined,
            type: args.type ? String(args.type) as 'one_time' | 'price_trigger' | 'monitoring' | 'date_driven' : undefined,
            priority: args.priority ? String(args.priority) as 'low' | 'medium' | 'high' | 'urgent' : undefined,
            linkedSymbols: args.linked_symbols ? (args.linked_symbols as string[]) : undefined,
            dueDate: args.due_date ? String(args.due_date) : undefined,
            sourceType: args.source_type ? String(args.source_type) as 'manual' | 'agent_chat' | 'analysis_report' : 'agent_chat',
            sourceId: args.source_id ? String(args.source_id) : undefined,
          }),
        )(),
    );
  }

  if (enabled.has('task_list')) {
    registry.register(
      'task_list',
      '查询当前用户的投资任务列表（支持按状态、优先级、关键词过滤）',
      taskListSchema,
      async (_id, args) =>
        wrap(async () =>
          listTasksBiz({
            status: args.status ? String(args.status) as any : undefined,
            priority: args.priority ? String(args.priority) as any : undefined,
            search: args.search ? String(args.search) : undefined,
            limit: args.limit ? Number(args.limit) : undefined,
            offset: args.offset ? Number(args.offset) : undefined,
          }),
        )(),
    );
  }

  if (enabled.has('task_update')) {
    registry.register(
      'task_update',
      '更新投资任务（修改状态、内容、添加执行备注等）',
      taskUpdateSchema,
      async (_id, args) =>
        wrap(async () =>
          updateTaskBiz(String(args.task_id), {
            status: args.status ? String(args.status) as any : undefined,
            title: args.title ? String(args.title) : undefined,
            description: args.description ? String(args.description) : undefined,
            priority: args.priority ? String(args.priority) as any : undefined,
            executionNotes: args.execution_notes ? String(args.execution_notes) : undefined,
            linkedSymbols: args.linked_symbols ? (args.linked_symbols as string[]) : undefined,
          }),
        )(),
    );
  }
}
