import { type RawToolDefinition, type ToolMetadata, type SchemaProperty } from '@/types/tool/metadata';

// ============= 内置工具定义 =============
// NOTE: 以下定义必须与 registerBusinessTools.ts 中的工具注册保持同步。
// 新增或修改工具时，请同步更新此处的 BUSINESS_TOOL_DEFINITIONS。
export const BUILTIN_TOOL_DEFINITIONS: RawToolDefinition[] = [
  {
    name: 'read_file',
    description: '读取文件内容',
    category: 'system',
    parameters: [
      { name: 'path', type: 'string', description: '文件路径', required: true },
    ],
  },
  {
    name: 'search_files',
    description: '在项目中搜索文件内容',
    category: 'system',
    parameters: [
      { name: 'pattern', type: 'string', description: '搜索正则表达式', required: true },
      { name: 'path', type: 'string', description: '搜索目录路径', required: false },
    ],
  },
  {
    name: 'list_directory',
    description: '列出目录下的文件和子目录',
    category: 'system',
    parameters: [
      { name: 'path', type: 'string', description: '目录路径', required: true },
    ],
  },
  {
    name: 'web_search',
    description: '使用搜索引擎搜索互联网上的最新信息',
    category: 'system',
    parameters: [
      { name: 'query', type: 'string', description: '搜索关键词', required: true },
    ],
  },
  {
    name: 'web_fetch',
    description: '获取指定 URL 的网页内容',
    category: 'system',
    parameters: [
      { name: 'url', type: 'string', description: '目标 URL', required: true },
    ],
  },
  {
    name: 'think',
    description: '让模型进行深度思考，适用于复杂推理场景',
    category: 'system',
    parameters: [
      { name: 'thought', type: 'string', description: '需要思考的内容', required: true },
    ],
  },
];

// ============= 业务工具定义 =============
export const BUSINESS_TOOL_DEFINITIONS: RawToolDefinition[] = [
  {
    name: 'stock_get_price',
    description: '获取股票价格数据（支持美股、A股、港股）。根据代码自动识别市场。',
    category: 'stock',
    parameters: [
      { name: 'stock_code', type: 'string', description: '股票代码，如 AAPL, 600519, 0700.HK', required: true },
      { name: 'start_date', type: 'string', description: '开始日期 (YYYY-MM-DD)，默认30天前', required: false },
      { name: 'end_date', type: 'string', description: '结束日期 (YYYY-MM-DD)，默认今天', required: false },
    ],
  },
  {
    name: 'stock_market_info',
    description: '查询资产的市场分析信息（评级、财报分析、投资笔记）',
    category: 'stock',
    parameters: [
      { name: 'symbol', type: 'string', description: '资产代号（股票、ETF等）', required: true },
    ],
  },
  {
    name: 'stock_company_info',
    description: '查询公司基本信息（行业、市值、简介等）',
    category: 'stock',
    parameters: [
      { name: 'symbol', type: 'string', description: '资产代号（股票、ETF等）', required: true },
    ],
  },
  {
    name: 'stock_search_news',
    description: '搜索股票相关新闻和资讯',
    category: 'stock',
    parameters: [
      { name: 'symbol', type: 'string', description: '资产代号（股票、ETF等）', required: true },
    ],
  },
  {
    name: 'note_query',
    description: '查询投资笔记（公司分析、行业研究、投资重点等）',
    category: 'note',
    parameters: [
      { name: 'query', type: 'string', description: '笔记搜索关键词', required: true },
    ],
  },
  {
    name: 'note_create',
    description: '创建新的投资笔记',
    category: 'note',
    parameters: [
      { name: 'title', type: 'string', description: '笔记标题', required: true },
      { name: 'content', type: 'string', description: '笔记内容', required: true },
      { name: 'tags', type: 'array', description: '标签列表', required: false },
    ],
  },
  {
    name: 'note_list',
    description: '列出当前用户的投资笔记（支持分页、搜索、标签过滤）',
    category: 'note',
    parameters: [
      { name: 'limit', type: 'number', description: '每页数量，默认20', required: false },
      { name: 'offset', type: 'number', description: '偏移量，默认0', required: false },
      { name: 'search', type: 'string', description: '搜索关键词（标题或内容）', required: false },
      { name: 'tag', type: 'string', description: '按标签过滤', required: false },
      { name: 'sort_by', type: 'string', description: '排序字段: createdAt | updatedAt | title，默认 createdAt', required: false },
      { name: 'sort_order', type: 'string', description: '排序方向: asc | desc，默认 desc', required: false },
    ],
  },
  {
    name: 'note_get',
    description: '获取单条投资笔记的完整内容',
    category: 'note',
    parameters: [
      { name: 'note_id', type: 'string', description: '笔记ID', required: true },
    ],
  },
  {
    name: 'note_update',
    description: '更新投资笔记的标题、内容或标签',
    category: 'note',
    parameters: [
      { name: 'note_id', type: 'string', description: '笔记ID', required: true },
      { name: 'title', type: 'string', description: '新标题', required: false },
      { name: 'content', type: 'string', description: '新内容', required: false },
      { name: 'tags', type: 'array', description: '新标签列表', required: false },
    ],
  },
  {
    name: 'note_delete',
    description: '删除投资笔记',
    category: 'note',
    parameters: [
      { name: 'note_id', type: 'string', description: '笔记ID', required: true },
    ],
  },
  {
    name: 'tavily_search',
    description: '搜索互联网最新信息（新闻、文章、数据等）',
    category: 'search',
    parameters: [
      { name: 'query', type: 'string', description: '搜索关键词', required: true },
    ],
  },
  {
    name: 'db_query',
    description: '查询本地数据库。可查询的表: notes, transactions, asset_positions, accounts, asset_meta, asset_market_info, analysis_reports, portfolio_snapshots, chat_sessions, model_providers。',
    category: 'search',
    parameters: [
      { name: 'table', type: 'string', description: '数据库表名，如: notes, transactions, asset_positions, accounts', required: true },
      { name: 'whereColumn', type: 'string', description: '查询条件的列名', required: false },
      { name: 'whereValue', type: 'string', description: '查询条件的值', required: false },
      { name: 'orderBy', type: 'string', description: '排序字段（蛇形命名）', required: false },
      { name: 'orderDirection', type: 'string', description: 'ASC 或 DESC，默认 DESC', required: false },
      { name: 'limit', type: 'number', description: '返回数量，默认10，最多100', required: false },
    ],
  },
  {
    name: 'transaction_history',
    description: '获取账户的交易历史记录，包括存款、取款、买入、卖出等',
    category: 'transaction',
    parameters: [
      { name: 'limit', type: 'number', description: '返回记录数量限制（默认 50）', required: false },
      { name: 'offset', type: 'number', description: '偏移量（用于分页，默认 0）', required: false },
    ],
  },
  {
    name: 'transaction_history_by_date',
    description: '按日期范围查询账户的交易历史记录',
    category: 'transaction',
    parameters: [
      { name: 'start_date', type: 'string', description: '开始日期（YYYY-MM-DD 格式）', required: true },
      { name: 'end_date', type: 'string', description: '结束日期（YYYY-MM-DD 格式）', required: true },
      { name: 'limit', type: 'number', description: '返回记录数量限制', required: false },
      { name: 'offset', type: 'number', description: '偏移量（用于分页）', required: false },
    ],
  },
  {
    name: 'account_balance',
    description: '获取账户当前余额（直接读取账户资金字段）',
    category: 'transaction',
    parameters: [
      { name: 'before_transaction_id', type: 'string', description: '计算到指定交易之前的余额', required: false },
    ],
  },
  {
    name: 'transaction_summary',
    description: '获取账户交易记录的 Markdown 格式摘要',
    category: 'transaction',
    parameters: [
      { name: 'limit', type: 'number', description: '记录数量限制（默认 50）', required: false },
    ],
  },
  {
    name: 'add_transaction',
    description: '添加交易记录（存款、取款、买入、卖出）',
    category: 'transaction',
    parameters: [
      { name: 'account_id', type: 'string', description: '账户 ID', required: true },
      { name: 'type', type: 'string', description: '交易类型: deposit | withdrawal | buy | sell', required: true },
      { name: 'amount', type: 'number', description: '金额（存款/取款时必填）', required: false },
      { name: 'sector', type: 'string', description: '资产类型: stock | etf | fund | crypto，默认 stock', required: false },
      { name: 'market', type: 'string', description: '市场: US | CN | HK', required: false },
      { name: 'symbol', type: 'string', description: '股票代码（买入/卖出时必填）', required: false },
      { name: 'quantity', type: 'number', description: '数量（买入/卖出时必填）', required: false },
      { name: 'price', type: 'number', description: '价格（买入/卖出时必填）', required: false },
      { name: 'description', type: 'string', description: '交易描述', required: false },
      { name: 'trade_time', type: 'string', description: '交易时间（ISO 格式）', required: false },
    ],
  },
  {
    name: 'asset_market_info_list',
    description: '获取指定资产的市场信息列表（本地数据库）',
    category: 'market',
    parameters: [
      { name: 'asset_meta_id', type: 'string', description: '资产元数据 ID', required: true },
      { name: 'page', type: 'string', description: '页码，默认 1', required: false },
      { name: 'limit', type: 'string', description: '每页数量，默认 10', required: false },
    ],
  },
  {
    name: 'asset_market_info_latest',
    description: '获取指定资产的最新市场信息（本地数据库）',
    category: 'market',
    parameters: [
      { name: 'asset_meta_id', type: 'string', description: '资产元数据 ID', required: true },
    ],
  },
  {
    name: 'asset_market_info_detail',
    description: '获取指定 ID 的市场信息详情',
    category: 'market',
    parameters: [
      { name: 'id', type: 'string', description: '市场信息记录 ID', required: true },
    ],
  },
  {
    name: 'asset_market_info_save',
    description: '保存新的市场信息到本地数据库',
    category: 'market',
    parameters: [
      { name: 'asset_meta_ids', type: 'array', description: '关联的资产元数据 IDs', required: true },
      { name: 'title', type: 'string', description: '标题', required: true },
      { name: 'symbol', type: 'string', description: '资产代号', required: true },
      { name: 'sentiment', type: 'string', description: '情绪评级', required: true },
      { name: 'importance', type: 'string', description: '重要性', required: true },
      { name: 'summary', type: 'string', description: '摘要', required: true },
      { name: 'key_topics', type: 'string', description: '关键主题', required: false },
      { name: 'market_impact', type: 'string', description: '市场影响', required: true },
      { name: 'key_data_points', type: 'string', description: '关键数据点', required: false },
      { name: 'source_url', type: 'string', description: '来源 URL', required: false },
      { name: 'source_name', type: 'string', description: '来源名称', required: false },
      { name: 'original_content', type: 'string', description: '原始内容', required: false },
      { name: 'content_mode', type: 'string', description: '内容模式: ai_summary | original，默认 ai_summary', required: false },
      { name: 'market_info_id', type: 'string', description: '用于获取原文内容的市场信息 ID', required: false },
    ],
  },
  {
    name: 'asset_market_info_update',
    description: '更新指定 ID 的市场信息',
    category: 'market',
    parameters: [
      { name: 'id', type: 'string', description: '市场信息记录 ID', required: true },
      { name: 'asset_meta_ids', type: 'array', description: '关联的资产元数据 IDs', required: false },
      { name: 'title', type: 'string', description: '标题', required: false },
      { name: 'symbol', type: 'string', description: '资产代号', required: false },
      { name: 'sentiment', type: 'string', description: '情绪评级', required: false },
      { name: 'importance', type: 'string', description: '重要性', required: false },
      { name: 'summary', type: 'string', description: '摘要', required: false },
      { name: 'key_topics', type: 'string', description: '关键主题', required: false },
      { name: 'market_impact', type: 'string', description: '市场影响', required: false },
      { name: 'key_data_points', type: 'string', description: '关键数据点', required: false },
      { name: 'source_url', type: 'string', description: '来源 URL', required: false },
      { name: 'source_name', type: 'string', description: '来源名称', required: false },
      { name: 'original_content', type: 'string', description: '原始内容', required: false },
      { name: 'content_mode', type: 'string', description: '内容模式: ai_summary | original', required: false },
    ],
  },
  {
    name: 'asset_market_info_delete',
    description: '删除指定 ID 的市场信息',
    category: 'market',
    parameters: [
      { name: 'id', type: 'string', description: '市场信息记录 ID', required: true },
    ],
  },
  {
    name: 'report_list',
    description: '获取报告列表（支持按类型过滤和分页）',
    category: 'report',
    parameters: [
      { name: 'account_id', type: 'string', description: '账户 ID（可选）', required: false },
      { name: 'type', type: 'string', description: '报告类型: weekly | monthly | emergency', required: false },
      { name: 'limit', type: 'string', description: '返回数量，默认 20', required: false },
      { name: 'offset', type: 'string', description: '偏移量，默认 0', required: false },
    ],
  },
  {
    name: 'report_detail',
    description: '获取指定报告 ID 的详情',
    category: 'report',
    parameters: [
      { name: 'report_id', type: 'string', description: '报告 ID', required: true },
    ],
  },
  {
    name: 'portfolio_query',
    description: '查询用户投资组合概览（市值、持仓、盈亏、风险等级）。当用户询问持仓、资产、盈亏或风险时，优先调用此工具而非 db_query。',
    category: 'asset',
    parameters: [],
  },
  {
    name: 'asset_meta_create',
    description: '创建新的资产元数据记录',
    category: 'asset',
    parameters: [
      { name: 'symbol', type: 'string', description: '资产代号（股票代码）', required: true },
      { name: 'priceCents', type: 'number', description: '价格（单位：分）', required: true },
      { name: 'assetType', type: 'string', description: '资产类型', required: true, enum: ['stock', 'etf', 'fund', 'crypto'] },
      { name: 'currency', type: 'string', description: '货币代码，如 CNY, USD, HKD', required: true },
      { name: 'source', type: 'string', description: '数据来源标识', required: true },
      { name: 'market', type: 'string', description: '市场', required: true, enum: ['CN', 'US', 'HK'] },
      { name: 'chineseName', type: 'string', description: '中文名称', required: false },
      { name: 'fullName', type: 'string', description: '完整名称', required: false },
      { name: 'logoUrl', type: 'string', description: 'Logo URL', required: false },
      { name: 'investmentMemo', type: 'string', description: '投资备忘录', required: false },
    ],
  },
  {
    name: 'asset_meta_update',
    description: '更新已有的资产元数据记录',
    category: 'asset',
    parameters: [
      { name: 'id', type: 'number', description: '资产元数据 ID', required: true },
      { name: 'symbol', type: 'string', description: '资产代号（股票代码）', required: false },
      { name: 'priceCents', type: 'number', description: '价格（单位：分）', required: false },
      { name: 'assetType', type: 'string', description: '资产类型', required: false, enum: ['stock', 'etf', 'fund', 'crypto'] },
      { name: 'currency', type: 'string', description: '货币代码，如 CNY, USD, HKD', required: false },
      { name: 'source', type: 'string', description: '数据来源标识', required: false },
      { name: 'market', type: 'string', description: '市场', required: false, enum: ['CN', 'US', 'HK'] },
      { name: 'chineseName', type: 'string', description: '中文名称，传空字符串表示清空', required: false },
      { name: 'fullName', type: 'string', description: '完整名称，传空字符串表示清空', required: false },
      { name: 'logoUrl', type: 'string', description: 'Logo URL，传空字符串表示清空', required: false },
      { name: 'investmentMemo', type: 'string', description: '投资备忘录，传空字符串表示清空', required: false },
    ],
  },
];

// ============= 工具清单构建 =============

export function buildToolMetadataList(): ToolMetadata[] {
  const builtinTools: ToolMetadata[] = BUILTIN_TOOL_DEFINITIONS.map((def) => ({
    name: def.name,
    description: def.description,
    category: def.category,
    source: 'builtin' as const,
    schema: buildSchemaFromParameters(def.parameters),
    parameters: def.parameters,
  }));

  const businessTools: ToolMetadata[] = BUSINESS_TOOL_DEFINITIONS.map((def) => ({
    name: def.name,
    description: def.description,
    category: def.category,
    source: 'business' as const,
    schema: buildSchemaFromParameters(def.parameters),
    parameters: def.parameters,
  }));

  return [...builtinTools, ...businessTools];
}

function buildSchemaFromParameters(parameters: SchemaProperty[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of parameters) {
    const schemaProp: Record<string, unknown> = {
      type: param.type,
      description: param.description,
    };

    if (param.enum) {
      schemaProp.enum = param.enum;
    }

    properties[param.name] = schemaProp;

    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: 'object',
    properties,
    required,
  };
}
