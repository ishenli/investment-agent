/**
 * 对外 MCP 工具白名单
 *
 * 以只读业务能力为主；写操作工具（新增交易、任务三件套）与外部搜索
 * （TravilySearch）默认不在白名单。例外：用户显式要求将「市场信息录入」
 * （marketInfoSaveTool，写操作）暴露给外部 Agent，故随白名单一起注册。
 * 名单为单一数据源，增删集中于此。
 *
 * 设计依据 design.md - D3。
 */
import {
  noteQueryClaudeTool,
  stockGetPriceClaudeTool,
  stockRecallCompanyInfoClaudeTool,
  stockRecallMarketInfoClaudeTool,
  stockSearchNewsClaudeTool,
  searchAssetInfoClaudeTool,
  marketInfoSaveClaudeTool,
  dbQueryClaudeTool,
  accountBalanceClaudeTool,
  transactionHistoryByDateClaudeTool,
  transactionHistoryClaudeTool,
  transactionSummaryClaudeTool,
} from '@server/tools';

import { toMcpTool, withReadOnlyGuard } from './adapters';
import type { McpToolWithHandler } from './adapters';

/** dbQuery 结构化参数 → SQL 文本（供只读守卫校验，纵深防御） */
function dbQueryToSql(args: Record<string, unknown>): string | undefined {
  if (typeof args.table !== 'string') {
    return undefined;
  }
  let sql = `SELECT * FROM ${args.table}`;
  if (typeof args.whereColumn === 'string' && args.whereValue !== undefined) {
    sql += ` WHERE ${args.whereColumn} = '${String(args.whereValue)}'`;
  }
  return sql;
}

/**
 * 构建对外暴露的 MCP 工具列表。
 * dbQueryClaudeTool 以只读守卫包装后再注册。
 */
export function buildWhitelistTools(): McpToolWithHandler[] {
  const readOnly = [
    noteQueryClaudeTool,
    stockRecallMarketInfoClaudeTool,
    stockRecallCompanyInfoClaudeTool,
    stockSearchNewsClaudeTool,
    stockGetPriceClaudeTool,
    searchAssetInfoClaudeTool,
    accountBalanceClaudeTool,
    transactionHistoryClaudeTool,
    transactionHistoryByDateClaudeTool,
    transactionSummaryClaudeTool,
  ];

  const tools = readOnly.map((tool) => toMcpTool(tool));
  tools.push(
    toMcpTool(dbQueryClaudeTool, async (args) => {
      const guarded = withReadOnlyGuard(
        dbQueryClaudeTool.handler,
        (a: Record<string, unknown>) => dbQueryToSql(a),
      );
      return guarded(args as never, undefined);
    }),
  );
  // 用户显式要求暴露的写操作：市场信息录入（区别于默认只读白名单）
  tools.push(toMcpTool(marketInfoSaveClaudeTool));
  return tools;
}

/** 工具名集合（用于断言 tools/list 的一致性） */
export const whitelistToolNames = buildWhitelistTools().map((t) => t.tool.name);