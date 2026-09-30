import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { isReadOnlySql, toMcpTool, withReadOnlyGuard } from '../adapters';
import type { McpToolWithHandler } from '../adapters';

function makeRegistration(name = 'noteQueryTool', desc = '查询投资笔记') {
  const shape = {
    query: z.string().describe('查询关键词'),
    limit: z.number().optional(),
  } as const;
  return {
    name,
    description: desc,
    inputSchema: shape,
    handler: vi.fn(async () => ({
      content: [{ type: 'text' as const, text: 'result' }],
    })),
  };
}

describe('toMcpTool', () => {
  it('将 name/description/inputSchema 转换为 MCP Tool 声明', () => {
    const reg = makeRegistration();
    const { tool } = toMcpTool(reg);

    expect(tool.name).toBe('noteQueryTool');
    expect(tool.description).toBe('查询投资笔记');
    expect(tool.inputSchema).toMatchObject({
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' },
      },
    });
  });

  it('handler 透传：调用时返回 MCP CallToolResult 结构', async () => {
    const reg = makeRegistration();
    const { handler } = toMcpTool(reg);

    const result = await handler({ query: 'AAPL' });
    expect(result).toEqual({ content: [{ type: 'text', text: 'result' }] });
    expect(reg.handler).toHaveBeenCalledWith({ query: 'AAPL' }, undefined);
  });

  it('handlerOverride 会替换执行逻辑', async () => {
    const reg = makeRegistration();
    const override = vi.fn(async () => ({ content: [{ type: 'text' as const, text: 'overridden' }] }));
    const { handler } = toMcpTool(reg, override as never);

    const result = await handler({ query: 'x' } as never);
    expect(result).toEqual({ content: [{ type: 'text', text: 'overridden' }] });
    expect(override).toHaveBeenCalledWith({ query: 'x' });
    expect(reg.handler).not.toHaveBeenCalled();
  });
});

describe('isReadOnlySql', () => {
  it('SELECT 语句放行', () => {
    expect(isReadOnlySql('SELECT * FROM notes')).toBe(true);
    expect(isReadOnlySql('  select id from notes limit 5')).toBe(true); // 前导空白 + 小写
    expect(isReadOnlySql('SELECT 1')).toBe(true);
  });

  it('WITH CTE 且无写特征是只读', () => {
    expect(isReadOnlySql('WITH t AS (SELECT 1) SELECT * FROM t')).toBe(true);
  });

  it('非 SELECT 语句拒绝', () => {
    expect(isReadOnlySql('INSERT INTO notes VALUES (1)')).toBe(false);
    expect(isReadOnlySql('UPDATE notes SET title = "x"')).toBe(false);
    expect(isReadOnlySql('DELETE FROM notes')).toBe(false);
    expect(isReadOnlySql('ALTER TABLE notes ADD COLUMN x')).toBe(false);
    expect(isReadOnlySql('DROP TABLE notes')).toBe(false);
    expect(isReadOnlySql('PRAGMA table_info(notes)')).toBe(false);
  });

  it('忽略前导行注释后判断', () => {
    expect(isReadOnlySql('-- 注释\nSELECT * FROM notes')).toBe(true);
    expect(isReadOnlySql('# 注释\nUPDATE notes SET x = 1')).toBe(false);
  });

  it('空字符串拒绝', () => {
    expect(isReadOnlySql('')).toBe(false);
    expect(isReadOnlySql('   ')).toBe(false);
  });
});

describe('withReadOnlyGuard', () => {
  it('extractSql 返回只读语句时透传 handler', async () => {
    const inner = vi.fn(async () => ({ content: [{ type: 'text' as const, text: 'ok' }] }));
    const guarded = withReadOnlyGuard(inner, (args) => (args as { sql: string }).sql);

    const result = await guarded({ sql: 'SELECT * FROM notes' } as never);
    expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }] });
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('extractSql 返回非 SELECT 时拒绝且不调用 handler', async () => {
    const inner = vi.fn(async () => ({ content: [{ type: 'text' as const, text: 'ok' }] }));
    const guarded = withReadOnlyGuard(inner, (args) => (args as { sql: string }).sql);

    const result = await guarded({ sql: 'DELETE FROM notes' } as never) as { isError?: boolean };
    expect(result.isError).toBe(true);
    expect(inner).not.toHaveBeenCalled();
  });

  it('不传 extractSql 时（无 SQL 可提取）直接透传', async () => {
    const inner = vi.fn(async () => ({ content: [{ type: 'text' as const, text: 'ok' }] }));
    const guarded = withReadOnlyGuard(inner);

    const result = await guarded({ table: 'notes' } as never);
    expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }] });
    expect(inner).toHaveBeenCalledTimes(1);
  });
});