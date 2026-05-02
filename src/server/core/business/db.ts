/**
 * Database Business Logic
 *
 * 纯业务函数，无框架耦合。
 */
import { DatabaseManager } from '@server/lib/DatabaseManager';
import logger from '@server/base/logger';

const VALID_TABLES = [
  'accounts',
  'account_funds',
  'user_selected_accounts',
  'asset_positions',
  'transactions',
  'revenue_metrics',
  'analysis_reports',
  'asset_meta',
  'asset_price_history',
  'asset_market_info',
  'asset_company_info',
  'agent',
  'notes',
  'settings',
  'model_providers',
  'provider_models',
  'scheduled_task_logs',
  'portfolio_snapshots',
  'chat_session_groups',
  'chat_sessions',
  'chat_topics',
  'chat_messages',
  'chat_threads',
  'chat_files',
  'chat_plugins',
];

const SOFT_DELETE_TABLES = [
  'accounts',
  'asset_positions',
  'transactions',
  'analysis_reports',
  'asset_meta',
  'notes',
];

const VALID_COLUMN_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export interface QueryDbOptions {
  table: string;
  whereColumn?: string;
  whereValue?: string | number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
}

/**
 * 查询本地 SQLite 数据库
 */
export async function queryDb(options: QueryDbOptions): Promise<string> {
  const { table, whereColumn, whereValue, orderBy, orderDirection = 'DESC', limit = 10 } = options;

  logger.info(`[business/db] queryDb:`, options);

  if (!table || table.trim() === '') {
    return `错误: 缺少必需参数 "table"。请指定要查询的数据库表名。`;
  }

  if (!VALID_TABLES.includes(table)) {
    return `错误: 无效的表名 "${table}"。可用的表包括: ${VALID_TABLES.join(', ')}`;
  }

  // 构建基础查询
  let query = `SELECT * FROM ${table}`;
  const queryParams: (string | number)[] = [];
  let hasWhere = false;

  // 添加软删除过滤（如果表支持）
  if (SOFT_DELETE_TABLES.includes(table)) {
    query += ` WHERE deleted_at IS NULL`;
    hasWhere = true;
  }

  // 添加用户自定义查询条件
  if (whereColumn && whereValue !== undefined) {
    if (!VALID_COLUMN_PATTERN.test(whereColumn)) {
      return `错误: 无效的列名 "${whereColumn}"。列名只能包含字母、数字和下划线。`;
    }
    query += hasWhere ? ' AND' : ' WHERE';
    query += ` ${whereColumn} = ?`;
    queryParams.push(whereValue);
    hasWhere = true;
  }

  // 添加排序
  if (orderBy) {
    if (!VALID_COLUMN_PATTERN.test(orderBy)) {
      return `错误: 无效的排序字段 "${orderBy}"。字段名只能包含字母、数字和下划线。`;
    }
    query += ` ORDER BY ${orderBy} ${orderDirection}`;
  }

  // 添加限制
  const finalLimit = Math.min(Math.max(1, limit), 100);
  query += ` LIMIT ${finalLimit}`;

  logger.info(`[business/db] Executing SQL: ${query}`, { params: queryParams });

  const client = DatabaseManager.getInstance().getClient();
  const results =
    queryParams.length > 0
      ? await client.execute({ sql: query, args: queryParams })
      : await client.execute(query);

  if (!results.rows || results.rows.length === 0) {
    return `查询成功，但未找到匹配的记录。\n表: ${table}\n条件: ${whereColumn ? `${whereColumn} = ${whereValue}` : '无'}`;
  }

  return `查询成功！\n表: ${table}\n记录数: ${results.rows.length}\n${whereColumn ? `条件: ${whereColumn} = ${whereValue}\n` : ''}${orderBy ? `排序: ${orderBy} ${orderDirection}\n` : ''}数据:\n${JSON.stringify(results.rows, null, 2)}`;
}
