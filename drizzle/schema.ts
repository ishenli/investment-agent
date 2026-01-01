import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

// 用户表（登录身份）
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 用户选择的账户表
export const userSelectedAccounts = sqliteTable('user_selected_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  // 交易时间，记录交易实际发生的时间
  tradeTime: integer('trade_time', { mode: 'timestamp' }),
});

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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 资产元数据表：保存资产信息和价格历史（允许相同 symbol 不同 timestamp/source）
export const assetMeta = sqliteTable('asset_meta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  symbol: text('symbol').notNull(), // 股票/ETF代码
  priceCents: integer('price_cents').notNull(), // 价格以最小货币单位存储
  assetType: text('asset_type', { enum: ['stock', 'etf', 'fund', 'crypto'] })
    .notNull()
    .default('stock'),
  currency: text('currency').notNull().default('USD'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(), // 价格时间戳
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(), // 价格更新时间戳
  source: text('source').notNull().default('finnhub'), // 数据来源
  market: text('market', { enum: ['CN', 'US', 'HK'] })
    .notNull()
    .default('US'),
  chineseName: text('chinese_name'), // 中文名称
  investmentMemo: text('investment_memo'), // 投资笔记，用于AI分析的上下文信息
});

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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
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
});

// 公司信息表：保存资产的公司财务/销售等信息
export const assetCompanyInfo = sqliteTable('asset_company_info', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetMetaId: integer('asset_meta_id')
    .notNull()
    .references(() => assetMeta.id),
  title: text('title').notNull(), // 标题
  content: text('content').notNull(), // 内容
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const agent = sqliteTable('agent', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  systemRole: text('system_role'),
  logo: text('logo'),
  apiKey: text('api_key').notNull(),
  apiUrl: text('api_url').notNull(),
  openingQuestions: text('opening_questions', { mode: 'json' }).notNull().default([]),
  type: text('type', { enum: ['LOCAL', 'LINGXI'] })
    .notNull()
    .default('LOCAL'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 一个设置的数据表，能够管理每个账户的配置项
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  key: text('key').notNull(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
