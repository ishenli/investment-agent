import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// 用户表（登录身份）
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // 软删除时间戳
}, (table) => [
  index('idx_users_deleted_at').on(table.deletedAt),
]);

// 交易账户（一个 user 可以有多个 account）
export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  accountName: text('account_name'),
  market: text('market', { enum: ['CN', 'US', 'HK'] })
    .notNull()
    .default('US'),
  currency: text('currency').notNull().default('USD'),
  leverage: integer('leverage').notNull().default(1),
  riskMode: text('risk_mode', { enum: ['retail', 'advanced'] })
    .notNull()
    .default('retail'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // 软删除时间戳
}, (table) => [
  index('idx_accounts_user_id').on(table.userId),
  index('idx_accounts_deleted_at').on(table.deletedAt),
]);

// 账户资金表：使用 integer 存储最小货币单位（例如 cents）以避免浮点误差
export const accountFunds = sqliteTable('account_funds', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  // amount_cents 存储为整数，代表最小货币单位（例如 USD cents）
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('USD'),
  // leverage moved to accounts for default; keep here if per-fund override needed
  leverage: integer('leverage').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_account_funds_account_currency_unique').on(table.accountId, table.currency),
  index('idx_account_funds_account_id').on(table.accountId),
]);

// 用户选择的账户表
export const userSelectedAccounts = sqliteTable('user_selected_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_user_selected_accounts_user_account_unique').on(table.userId, table.accountId),
]);

// 资产持仓表
export const assetPositions = sqliteTable('asset_positions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  symbol: text('symbol').notNull(),
  // quantity in shares (use integer for lots if preferred, else real)
  quantity: real('quantity').notNull(),
  // averagePrice stored as integer cents per share to avoid float issues
  averagePriceCents: integer('average_price_cents').notNull(),
  // sector information for the stock
  sector: text('sector', { enum: ['stock', 'etf', 'fund', 'crypto'] }).default('stock'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // 软删除时间戳
}, (table) => [
  // 仅对未删除记录使用唯一约束（避免软删除后无法创建同标的的新持仓）
  uniqueIndex('idx_asset_positions_account_symbol_unique')
    .on(table.accountId, table.symbol)
    .where(sql`${table.deletedAt} is null`),
  index('idx_asset_positions_deleted_at').on(table.deletedAt),
]);

// 交易/账本记录表（支持 trade 与 cash events）
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  type: text('type', {
    enum: ['buy', 'sell', 'deposit', 'withdrawal', 'fee', 'transfer'],
  }).notNull(),
  // symbol/quantity/price 可空，非交易类型（deposit/withdrawal）可不填
  symbol: text('symbol'),
  quantity: real('quantity'),
  // price stored as cents per share when applicable
  priceCents: integer('price_cents'),
  // total amount of the transaction in cents (positive for deposit/buy, negative for withdrawal/sell?)
  totalAmountCents: integer('total_amount_cents').notNull(),
  feeCents: integer('fee_cents').notNull().default(0),
  // market type for the transaction
  market: text('market', { enum: ['US', 'CN', 'HK'] }).default('US'),
  description: text('description'),
  status: text('status', { enum: ['pending', 'completed', 'failed'] })
    .notNull()
    .default('completed'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  // 交易时间，记录交易实际发生的时间
  tradeTime: integer('trade_time', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // 软删除时间戳（审计用，一般不直接删除交易记录）
}, (table) => [
  index('idx_transactions_account_created_at').on(table.accountId, table.createdAt),
  index('idx_transactions_account_trade_time').on(table.accountId, table.tradeTime),
  index('idx_transactions_deleted_at').on(table.deletedAt),
]);

// 收益/指标表
export const revenueMetrics = sqliteTable('revenue_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  period: text('period').notNull(), // 7d, 30d, 90d, 1y, all
  sharpeRatio: real('sharpe_ratio'),
  maxDrawdown: real('max_drawdown'),
  winRate: real('win_rate'),
  profitFactor: real('profit_factor'),
  totalTrades: integer('total_trades'),
  unrealizedGainLoss: real('unrealized_gain_loss'),
  // netProfit stored in cents
  netProfitCents: integer('net_profit_cents'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 分析报告表：保存生成的分析报告（周报、月报等）
export const analysisReports = sqliteTable('analysis_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  type: text('type').notNull().default('weekly'), // weekly, monthly, emergency
  title: text('title').notNull(),
  content: text('content').notNull(), // Markdown 内容
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }),

  // 报告生成进度追踪
  generationProgress: integer('generation_progress').default(0), // 0-100
  generationStage: text('generation_stage'), // 当前阶段描述
  dataSourceSummary: text('data_source_summary'), // JSON: 数据来源摘要

  // 手动编辑元数据（向后兼容）
  isManuallyEdited: integer('is_manually_edited', { mode: 'boolean' }).default(false),
  lastEditedAt: integer('last_edited_at', { mode: 'timestamp' }),
  editCount: integer('edit_count').default(0),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // 软删除时间戳
}, (table) => [
  index('idx_analysis_reports_deleted_at').on(table.deletedAt),
]);

// 资产元数据表：保存资产信息和价格历史（允许相同 symbol 不同 timestamp/source）
export const assetMeta = sqliteTable('asset_meta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  symbol: text('symbol').notNull(), // 股票/ETF代码
  priceCents: integer('price_cents').notNull(), // 价格以最小货币单位存储
  assetType: text('asset_type', { enum: ['stock', 'etf', 'fund', 'crypto'] })
    .notNull()
    .default('stock'),
  currency: text('currency').notNull().default('USD'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()), // 价格时间戳
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()), // 价格更新时间戳
  source: text('source').notNull().default('finnhub'), // 数据来源
  market: text('market', { enum: ['CN', 'US', 'HK'] })
    .notNull()
    .default('US'),
  chineseName: text('chinese_name'), // 中文名称
  fullName: text('full_name'), // 英文全称
  logoUrl: text('logo_url'), // Logo 地址
  investmentMemo: text('investment_memo'), // 投资笔记，用于AI分析的上下文信息
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // 软删除时间戳
}, (table) => [
  uniqueIndex('idx_asset_meta_symbol_market_unique').on(table.symbol, table.market),
  index('idx_asset_meta_deleted_at').on(table.deletedAt),
]);

// 资产价格历史表：保存资产的每日价格历史
export const assetPriceHistory = sqliteTable('asset_price_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  symbol: text('symbol').notNull(),
  priceCents: integer('price_cents').notNull(), // 收盘价
  openCents: integer('open_cents'), // 开盘价
  highCents: integer('high_cents'), // 最高价
  lowCents: integer('low_cents'), // 最低价
  date: integer('date', { mode: 'timestamp' }).notNull(), // 价格日期
  market: text('market', { enum: ['CN', 'US', 'HK'] })
    .notNull()
    .default('US'),
  source: text('source').notNull().default('finnhub'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_asset_price_symbol_date').on(table.symbol, table.date),
]);

// 市场信息表：保存资产的市场分析信息
export const assetMarketInfo = sqliteTable('asset_market_info', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // assetMetaId removed, using junction table assetMarketInfoToAssetMeta
  title: text('title').notNull(), // 分析标题
  symbol: text('symbol').notNull(), // 资产标识 (Primary symbol or comma-separated list for display)
  sentiment: text('sentiment').notNull().default('neutral'), // 投资倾向
  importance: text('importance').notNull().default('5'), // 重要性评分 (1-10)
  summary: text('summary').notNull(), // 内容摘要
  keyTopics: text('key_topics'), // 关键主题
  marketImpact: text('market_impact').notNull(), // 市场影响评估
  keyDataPoints: text('key_data_points'), // 重要数据点
  sourceUrl: text('source_url'), // 来源URL
  sourceName: text('source_name'), // 来源名称
  originalContent: text('original_content'), // 原始文章内容（用于原文保留模式）
  contentMode: text('content_mode', { enum: ['ai_summary', 'original'] })
    .notNull()
    .default('ai_summary'), // 内容处理模式：ai_summary（AI摘要）或 original（原文保留）
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 关联表：assetMarketInfo <-> assetMeta (Many-to-Many)
export const assetMarketInfoToAssetMeta = sqliteTable('asset_market_info_to_asset_meta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetMarketInfoId: integer('asset_market_info_id')
    .notNull()
    .references(() => assetMarketInfo.id, { onDelete: 'cascade' }),
  assetMetaId: integer('asset_meta_id')
    .notNull()
    .references(() => assetMeta.id, { onDelete: 'cascade' }),
}, (table) => [
  uniqueIndex('idx_asset_market_info_to_asset_meta_unique')
    .on(table.assetMarketInfoId, table.assetMetaId),
]);

// 公司信息表：保存资产的公司财务/销售等信息
export const assetCompanyInfo = sqliteTable('asset_company_info', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetMetaId: integer('asset_meta_id')
    .notNull()
    .references(() => assetMeta.id),
  title: text('title').notNull(), // 标题
  content: text('content').notNull(), // 内容
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const agent = sqliteTable('agent', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  systemRole: text('system_role'),
  logo: text('logo'),
  openingQuestions: text('opening_questions', { mode: 'json' }).notNull().default([]),
  type: text('type', { enum: ['LOCAL', 'LINGXI'] })
    .notNull()
    .default('LOCAL'),
  isBuiltin: integer('is_builtin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 新增一个笔记模块，用来记录用户笔记，同时也可以绑定各种标签
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags', { mode: 'json' }).notNull().default([]),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // 软删除时间戳
}, (table) => [
  index('idx_notes_deleted_at').on(table.deletedAt),
]);

// 一个设置的数据表，能够管理每个账户的配置项
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  key: text('key').notNull(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_settings_user_key_unique').on(table.userId, table.key),
]);

// 模型服务商表：存储 AI 模型服务提供商配置
export const modelProviders = sqliteTable('model_providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  anthropicUrl: text('anthropic_url'),
  apiKey: text('api_key'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_model_providers_user_slug_unique').on(table.userId, table.slug),
]);

// 服务商模型表：存储每个服务商支持的模型
export const providerModels = sqliteTable('provider_models', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: integer('provider_id')
    .notNull()
    .references(() => modelProviders.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  contextWindow: integer('context_window'),
  supportsVision: integer('supports_vision', { mode: 'boolean' }).default(false),
  supportsFunctionCalling: integer('supports_function_calling', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_provider_models_provider_slug_unique').on(table.providerId, table.slug),
]);

// 定时任务执行日志表：记录定时任务的执行历史
export const scheduledTaskLogs = sqliteTable('scheduled_task_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // 任务类型
  taskType: text('task_type', { enum: ['daily_snapshot', 'price_sync'] }).notNull(),
  // 执行日期（UTC 零点时间戳，用于幂等性检查）
  executionDate: integer('execution_date', { mode: 'timestamp' }).notNull(),
  // 执行状态
  status: text('status', { enum: ['success', 'failed', 'partial'] }).notNull(),
  // 执行详情（JSON 格式：如处理的股票数、失败列表等）
  metadata: text('metadata', { mode: 'json' }),
  // 开始时间
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  // 完成时间
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  // 错误信息
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  // 唯一索引：每个任务类型每天最多一条记录
  uniqueIndex('idx_task_type_date_unique').on(table.taskType, table.executionDate),
]);

// 投资组合快照表：记录账户每日的投资组合状态，用于历史业绩计算
export const portfolioSnapshots = sqliteTable('portfolio_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  // 快照日期（仅日期部分，不含时间）
  snapshotDate: integer('snapshot_date', { mode: 'timestamp' }).notNull(),
  // 总市值（以分为单位，避免浮点误差）
  totalValueCents: integer('total_value_cents').notNull(),
  // 现金余额（以分为单位）
  cashBalanceCents: integer('cash_balance_cents').notNull(),
  // 持仓明细快照（JSON 格式）
  // 结构: { positions: PositionSnapshot[], totalPositionsValueCents: number, positionCount: number }
  positions: text('positions', { mode: 'json' }).notNull(),
  // 基准价值（如 SPY 等价对比基准的价值，以分为单位）
  benchmarkValueCents: integer('benchmark_value_cents'),
  // 基准代码（默认 SPY）
  benchmarkSymbol: text('benchmark_symbol').default('SPY'),
  // 快照创建来源（scheduled: 定时创建, manual: 手动创建, backfill: 回填）
  source: text('source', { enum: ['scheduled', 'manual', 'backfill'] })
    .notNull()
    .default('scheduled'),
  // 备注（用于记录特殊情况，如重试信息）
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  // 唯一索引：每个账户每天最多一条快照
  uniqueIndex('idx_portfolio_snapshots_account_date_unique').on(table.accountId, table.snapshotDate),
  // 按日期范围查询快照
  index('idx_portfolio_snapshots_date').on(table.snapshotDate),
]);

// 技能表：管理用户的 AI 技能偏好设置
// 说明：name, description, category, config 等内容字段由文件系统 (SKILL.md) 管理
// 数据库仅存储用户偏好：启用状态、自定义图标等
export const skills = sqliteTable('skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull(), // 业务主键，对应 SKILL.md 目录名
  source: text('source').notNull(), // official | community | custom
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  icon: text('icon'), // 用户自定义图标
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  // 索引：按用户 ID 查询
  index('idx_skills_user_id').on(table.userId),
  // 唯一索引：每个用户的 slug 必须唯一
  uniqueIndex('idx_skills_user_slug_unique').on(table.userId, table.slug),
]);

// ============== Chat Storage Tables ==============
// 聊天存储相关表，从 drizzle/schema/chat.ts 导入
export {
  chatSessionGroups,
  chatSessions,
  chatTopics,
  chatMessages,
  chatThreads,
  chatFiles,
  chatPlugins,
  type AgentConfig,
  type SessionMeta,
  type ToolCall,
  type PluginInfo,
  type TranslateInfo,
  type ChatSession,
  type NewChatSession,
  type ChatTopic,
  type NewChatTopic,
  type ChatMessage,
  type NewChatMessage,
  type ChatThread,
  type NewChatThread,
  type ChatFile,
  type NewChatFile,
  type ChatSessionGroup,
  type NewChatSessionGroup,
  type ChatPlugin,
  type NewChatPlugin,
} from './schema/chat';
