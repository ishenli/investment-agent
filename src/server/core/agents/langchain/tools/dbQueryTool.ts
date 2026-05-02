import logger from '@server/base/logger';
import { queryDb } from '@server/core/business';
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
  limit: number = 10,
): Promise<string> {
  try {
    return await queryDb({
      table,
      whereColumn,
      whereValue,
      orderBy,
      orderDirection,
      limit,
    });
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
