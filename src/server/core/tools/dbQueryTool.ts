import logger from '@server/base/logger';
import { DatabaseManager } from '@server/lib/DatabaseManager';
import { tool as langchainTool } from 'langchain';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import z from 'zod';

/**
 * 数据库查询参数 Schema
 */
const DbQueryParams = z.object({
  table: z.string().min(1, '表名不能为空').describe('【必需】数据库表名，如: notes, transactions, asset_positions, accounts, model_providers, chat_sessions 等'),
  whereColumn: z.string().optional().describe('查询条件的列名（可选），如: userId, symbol, accountId 等'),
  whereValue: z.union([z.string(), z.number()]).optional().describe('查询条件的值（可选），如: 1, "AAPL" 等'),
  orderBy: z.string().optional().describe('排序字段（可选），如: createdAt, updatedAt, id 等。使用数据库实际列名（蛇形命名），如: created_at, updated_at'),
  orderDirection: z.enum(['ASC', 'DESC']).optional().default('DESC').describe('排序方向，ASC=升序，DESC=降序，默认降序'),
  limit: z.number().optional().default(10).describe('返回结果的最大数量，默认10条，最多100条'),
});

/**
 * 数据库查询核心逻辑
 */
async function executeDbQuery(
  table: string,
  whereColumn?: string,
  whereValue?: string | number,
  orderBy?: string,
  orderDirection: 'ASC' | 'DESC' = 'DESC',
  limit: number = 10
): Promise<string> {
  // 记录输入参数用于调试
  logger.info(`[dbQueryTool] Called with params:`, {
    table,
    whereColumn,
    whereValue,
    orderBy,
    orderDirection,
    limit,
  });
  
  try {
    // 验证必需参数
    if (!table || typeof table !== 'string' || table.trim() === '') {
      return `错误: 缺少必需参数 "table"。请指定要查询的数据库表名，如: transactions, notes, asset_positions 等。`;
    }
    // 验证表名是否存在（安全检查）
    const validTables = [
      'accounts', 'account_funds', 'user_selected_accounts', 
      'asset_positions', 'transactions', 'revenue_metrics', 'analysis_reports',
      'asset_meta', 'asset_price_history', 'asset_market_info', 'asset_company_info',
      'agent', 'notes', 'settings', 'model_providers', 'provider_models',
      'scheduled_task_logs', 'portfolio_snapshots',
      'chat_session_groups', 'chat_sessions', 'chat_topics', 'chat_messages',
      'chat_threads', 'chat_files', 'chat_plugins'
    ];

    if (!validTables.includes(table)) {
      return `错误: 无效的表名 "${table}"。可用的表包括: ${validTables.join(', ')}`;
    }

    // 构建基础查询
    let query = `SELECT * FROM ${table}`;
    const queryParams: any[] = [];
    let hasWhere = false;
    
    // 添加软删除过滤（如果表支持）
    const softDeleteTables = ['accounts', 'asset_positions', 'transactions', 'analysis_reports', 'asset_meta', 'notes'];
    if (softDeleteTables.includes(table)) {
      query += ` WHERE deleted_at IS NULL`;
      hasWhere = true;
    }
    
    // 添加用户自定义查询条件（如果有）
    if (whereColumn && whereValue !== undefined) {
      // 验证列名是否合法（防止 SQL 注入）
      const validColumnPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      if (!validColumnPattern.test(whereColumn)) {
        return `错误: 无效的列名 "${whereColumn}"。列名只能包含字母、数字和下划线。`;
      }
      
      query += hasWhere ? ' AND' : ' WHERE';
      query += ` ${whereColumn} = ?`;
      queryParams.push(whereValue);
      hasWhere = true;
    }
    
    // 添加排序
    if (orderBy) {
      // 验证排序字段是否合法
      const validColumnPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      if (!validColumnPattern.test(orderBy)) {
        return `错误: 无效的排序字段 "${orderBy}"。字段名只能包含字母、数字和下划线。`;
      }
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
    }
    
    // 添加限制
    const finalLimit = Math.min(Math.max(1, limit), 100); // 1-100之间
    query += ` LIMIT ${finalLimit}`;

    logger.info(`[dbQueryTool] Executing SQL: ${query}`, { params: queryParams });

    // 执行查询（使用 LibSQL 客户端）
    const dbManager = DatabaseManager.getInstance();
    const client = dbManager.getClient();
    const results = queryParams.length > 0 
      ? await client.execute({ sql: query, args: queryParams })
      : await client.execute(query);
    
    if (!results.rows || results.rows.length === 0) {
      return `查询成功，但未找到匹配的记录。\n表: ${table}\n条件: ${whereColumn ? `${whereColumn} = ${whereValue}` : '无'}`;
    }

    // 格式化结果
    const formattedResults = {
      table,
      count: results.rows.length,
      conditions: whereColumn ? { [whereColumn]: whereValue } : null,
      orderBy: orderBy ? `${orderBy} ${orderDirection}` : null,
      data: results.rows,
    };

    return `查询成功！\n表: ${table}\n记录数: ${results.rows.length}\n${whereColumn ? `条件: ${whereColumn} = ${whereValue}\n` : ''}${orderBy ? `排序: ${orderBy} ${orderDirection}\n` : ''}数据:\n${JSON.stringify(formattedResults.data, null, 2)}`;
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[dbQueryTool] query failed:`, error);
    return `数据库查询失败: ${errorMsg}`;
  }
}

/**
 * LangChain 规范的数据库查询工具
 */
export const dbQueryTool = langchainTool(
  async (params): Promise<string> => {
    const { table, whereColumn, whereValue, orderBy, orderDirection, limit } = params as z.infer<typeof DbQueryParams>;
    return executeDbQuery(table, whereColumn, whereValue, orderBy, orderDirection, limit);
  },
  {
    name: 'dbQueryTool',
    description: `数据库查询工具，支持查询本地 SQLite 数据库中的各种记录。

【重要】必须提供 table 参数，其他参数可选。

可查询的表包括：
- notes: 投资笔记（支持列：userId, title, content, tags）
- transactions: 交易记录（支持列：account_id, type, symbol, status, created_at, trade_time）
- asset_positions: 持仓信息（支持列：account_id, symbol, quantity, sector）
- accounts: 交易账户（支持列：userId, account_name, market, currency）
- asset_meta: 资产元数据（支持列：symbol, market, asset_type, chinese_name）
- asset_market_info: 市场分析（支持列：symbol, sentiment, importance, created_at）
- analysis_reports: 分析报告（支持列：account_id, type, title, created_at）
- portfolio_snapshots: 投资组合快照（支持列：account_id, snapshot_date）
- chat_sessions: 聊天会话（支持列：userId, type, slug, pinned）
- model_providers: 模型服务商（支持列：userId, slug, name, is_active）

使用示例：
1. 查询最新10条交易：{"table": "transactions", "orderBy": "created_at", "limit": 10}
2. 查询指定账户的持仓：{"table": "asset_positions", "whereColumn": "account_id", "whereValue": 1}
3. 查询某个股票信息：{"table": "asset_meta", "whereColumn": "symbol", "whereValue": "AAPL"}
4. 查询用户笔记：{"table": "notes", "whereColumn": "userId", "whereValue": 1, "orderBy": "updated_at"}

注意事项：
- table 参数【必需】，不能为空
- whereColumn 和 whereValue 必须同时提供或同时为空
- orderBy 使用数据库实际列名（蛇形命名），如: created_at, updated_at, account_id
- orderDirection 指定升序(ASC)或降序(DESC)
- 支持软删除的表会自动过滤已删除记录`,
    schema: DbQueryParams,
  },
);

/**
 * Claude Agent SDK 规范的数据库查询工具
 */
export const dbQueryClaudeTool = claudeTool(
  'dbQueryTool',
  `数据库查询工具，支持查询本地 SQLite 数据库中的各种记录。

【重要】必须提供 table 参数，其他参数可选。

可查询的表包括：
- notes: 投资笔记（支持列：userId, title, content, tags）
- transactions: 交易记录（支持列：account_id, type, symbol, status, created_at, trade_time）
- asset_positions: 持仓信息（支持列：account_id, symbol, quantity, sector）
- accounts: 交易账户（支持列：userId, account_name, market, currency）
- asset_meta: 资产元数据（支持列：symbol, market, asset_type, chinese_name）
- asset_market_info: 市场分析（支持列：symbol, sentiment, importance, created_at）
- analysis_reports: 分析报告（支持列：account_id, type, title, created_at）
- portfolio_snapshots: 投资组合快照（支持列：account_id, snapshot_date）
- chat_sessions: 聊天会话（支持列：userId, type, slug, pinned）
- model_providers: 模型服务商（支持列：userId, slug, name, is_active）

使用示例：
1. 查询最新10条交易：{"table": "transactions", "orderBy": "created_at", "limit": 10}
2. 查询指定账户的持仓：{"table": "asset_positions", "whereColumn": "account_id", "whereValue": 1}
3. 查询某个股票信息：{"table": "asset_meta", "whereColumn": "symbol", "whereValue": "AAPL"}
4. 查询用户笔记：{"table": "notes", "whereColumn": "userId", "whereValue": 1, "orderBy": "updated_at"}

注意事项：
- table 参数【必需】，不能为空
- whereColumn 和 whereValue 必须同时提供或同时为空
- orderBy 使用数据库实际列名（蛇形命名），如: created_at, updated_at, account_id
- orderDirection 指定升序(ASC)或降序(DESC)
- 支持软删除的表会自动过滤已删除记录`,
  {
    table: z.string().min(1, '表名不能为空').describe('【必需】数据库表名，如: notes, transactions, asset_positions, accounts, model_providers, chat_sessions 等'),
    whereColumn: z.string().optional().describe('查询条件的列名（可选），如: userId, symbol, accountId 等'),
    whereValue: z.union([z.string(), z.number()]).optional().describe('查询条件的值（可选），如: 1, "AAPL" 等'),
    orderBy: z.string().optional().describe('排序字段（可选），如: createdAt, updatedAt, id 等。使用数据库实际列名（蛇形命名），如: created_at, updated_at'),
    orderDirection: z.enum(['ASC', 'DESC']).optional().default('DESC').describe('排序方向，ASC=升序，DESC=降序，默认降序'),
    limit: z.number().optional().default(10).describe('返回结果的最大数量，默认10条，最多100条'),
  },
  async (args) => {
    try {
      const result = await executeDbQuery(
        args.table,
        args.whereColumn,
        args.whereValue,
        args.orderBy,
        args.orderDirection ?? 'DESC',
        args.limit ?? 10
      );
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[dbQueryClaudeTool] failed:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `数据库查询失败: ${errorMsg}`,
          },
        ],
        isError: true,
      };
    }
  }
);
