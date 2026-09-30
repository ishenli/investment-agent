/**
 * MCP Connector 适配层
 *
 * 将应用内 Claude Agent SDK 的工具定义（SdkMcpToolDefinition）转换为
 * 标准 MCP Tool 声明与执行 handler，供外部 CodingAgent（Codex / Claude Code）消费。
 *
 * 设计依据 design.md - D2：
 * - 薄转换：读取 name/description/inputSchema/handler，不重写业务逻辑
 * - `SdkMcpToolDefinition.handler` 返回 `{ content: [{ type: 'text', text }] }`，
 *   与 MCP `CallToolResult` 结构一致，直接透传
 * - inputSchema 是 ZodRawShape，用 zod4 原生 `toJSONSchema()` 转成 MCP JSON Schema
 */
import type { SdkMcpToolDefinition } from '@anthropic-ai/claude-agent-sdk';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

/** 非 SELECT 语句的前缀特征（大小写不敏感），用于 dbQuery 只读守卫。 */
const WRITE_SQL_PATTERNS = [
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bALTER\b/i,
  /\bDROP\b/i,
  /\bTRUNCATE\b/i,
  /\bCREATE\b/i,
  /\bREPLACE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bPRAGMA\b/i,
  /\bATTACH\b/i,
  /\bDETACH\b/i,
];

/**
 * 判断一段 SQL 是否为只读（SELECT-only）。
 * 忽略前导空白与 `--`/`#` 行注释后判断命令前缀；WITH（CTE）仅当不含写特征时放行。
 */
export function isReadOnlySql(sql: string): boolean {
  if (!sql || sql.trim() === '') {
    return false;
  }

  const stripped = sql
    .replace(/^\s*--.*$/gm, '')
    .replace(/^\s*#.*$/gm, '')
    .trimStart();

  // 任何位置出现写特征即拒绝（防 SELECT ... DELETE; 等夹带注入）
  if (WRITE_SQL_PATTERNS.some((p) => p.test(stripped))) {
    return false;
  }

  if (/^WITH\b/i.test(stripped)) {
    return true;
  }
  return /^SELECT\b/i.test(stripped);
}

/**
 * 只读守卫包装器：拒绝执行非 SELECT 语句。
 *
 * dbQueryClaudeTool 入参是结构化参数（table/whereColumn/...）而非裸 SQL，
 * 底层 `queryDb` 已硬编码 SELECT + 表名/列名白名单 + 参数化查询（天然只读）。
 * 本守卫作为纵深防御：当调用方在参数中夹带写语句特征时拒绝执行，
 * 并通过 `extractSql` 把结构化参数映射为 SQL 文本供校验。
 */
export function withReadOnlyGuard<Args, Extra>(
  handler: (args: Args, extra: Extra) => Promise<CallToolResult>,
  extractSql: (args: Args) => string | undefined = () => undefined,
): (args: Args, extra: Extra) => Promise<CallToolResult> {
  return async (args, extra) => {
    const sql = extractSql(args);
    if (sql !== undefined && !isReadOnlySql(sql)) {
      return {
        content: [{ type: 'text', text: '拒绝执行：仅允许只读 SELECT 查询，检测到非 SELECT 语句。' }],
        isError: true,
      } satisfies CallToolResult;
    }
    return handler(args, extra);
  };
}

/** 工具注册所需的内部形态：MCP Tool 声明 + 可调用的 handler。 */
export interface McpToolWithHandler {
  tool: Tool;
  handler: (args: Record<string, unknown>) => Promise<CallToolResult>;
}

/**
 * 将 ZodRawShape 转为 MCP Tool 的 inputSchema 形状（{ type, properties, required }）。
 *
 * 用 zod4 原生 toJSONSchema() 产出完整 JSON Schema，再提取 MCP 需要的三个字段，
 * 避免把 `$schema` 等多余字段带进工具描述。
 */
function toMcpInputSchema<Schema extends z.ZodRawShape>(
  shape: Schema,
): { [key: string]: unknown; type: 'object'; properties?: { [key: string]: object }; required?: string[] } {
  const json = z.object(shape).toJSONSchema();
  const { type, properties, required } = json;
  return {
    ...(typeof type === 'string' ? { type } : {}),
    ...(properties ? { properties } : {}),
    ...(required ? { required } : {}),
  } as { [key: string]: unknown; type: 'object'; properties?: { [key: string]: object }; required?: string[] };
}

/**
 * 将 claudeTool 注册对象平移为标准 MCP Tool 声明 + handler。
 *
 * @param registration claudeAgent-sdk 工具注册对象（SdkMcpToolDefinition）
 * @param handlerOverride 可选 handler 包装器（如只读守卫），不传则直接透传原 handler
 */
export function toMcpTool(
  // Sdk 的 inputSchema 在联合工具类型上无法由 ZodRawShape 推断，放宽到 any（适配层边界）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registration: SdkMcpToolDefinition<any>,
  handlerOverride?: (args: Record<string, unknown>) => Promise<CallToolResult>,): McpToolWithHandler {
  const rawHandler = registration.handler;

  const inputSchema = toMcpInputSchema(registration.inputSchema);

  const tool: Tool = {
    name: registration.name,
    description: registration.description,
    inputSchema,
  };

  // MCP handler 只接收 args，不暴露 SDK 的 extra；把 extra 固定为 undefined。
  // handler 期望 InferShape<Schema>，而 MCP 传入 plain object，结构等价（zod 保证入参形状），故转换签名。
  const handler: (args: Record<string, unknown>) => Promise<CallToolResult> =
    handlerOverride ?? ((args) => rawHandler(args as never, undefined));

  return { tool, handler };
}