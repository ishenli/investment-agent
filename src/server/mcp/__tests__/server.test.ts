import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';

import { createHttpMcpSession, createMcpServer } from '../server';
import type { McpHttpSession } from '../server';
import { buildWhitelistTools, whitelistToolNames } from '../whitelist';
import type { McpToolWithHandler } from '../adapters';

/** 启动一个 client↔server 内存连接，返回 client。 */
async function connectClient(tools: McpToolWithHandler[]) {
  const server = createMcpServer(tools);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

const stubTools: McpToolWithHandler[] = [
  {
    tool: {
      name: 'echo',
      description: 'echo input',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
    },
    handler: async () => ({ content: [{ type: 'text', text: 'pong' }] }),
  },
  {
    tool: {
      name: 'boom',
      description: 'throws',
      inputSchema: { type: 'object', properties: {} },
    },
    handler: async () => {
      throw new Error('boom');
    },
  },
];

describe('createMcpServer (stub tools)', () => {
  it('tools/list 返回注册的工具', async () => {
    const client = await connectClient(stubTools);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(['echo', 'boom']);
    expect(tools[0].description).toBe('echo input');
    await client.close();
  });

  it('tools/call 白名单内工具成功返回', async () => {
    const client = await connectClient(stubTools);
    const result = await client.callTool({ name: 'echo', arguments: { text: 'hi' } });
    expect(result.content).toEqual([{ type: 'text', text: 'pong' }]);
    await client.close();
  });

  it('tools/call 未注册工具名返回错误', async () => {
    const client = await connectClient(stubTools);
    await expect(client.callTool({ name: 'nope', arguments: {} })).rejects.toThrow(/Unknown tool|not found/i);
    await client.close();
  });

  it('tool handler 抛错时调用方收到错误', async () => {
    const client = await connectClient(stubTools);
    await expect(client.callTool({ name: 'boom', arguments: {} })).rejects.toThrow(/boom/i);
    await client.close();
  });
});

describe('buildWhitelistTools', () => {
  it('包含只读能力 + 用户显式暴露的市场信息录入，排除其他写操作与外部搜索', () => {
    const names = whitelistToolNames;

    // 已覆盖的能力
    expect(names).toContain('noteQueryTool');
    expect(names).toContain('transactionHistoryTool');

    // 用户显式要求的写操作：市场信息录入
    expect(names).toContain('marketInfoSaveTool');

    // 明确排除
    expect(names).not.toContain('addTransactionTool');
    expect(names).not.toContain('createTaskTool');
    expect(names).not.toContain('listTasksTool');
    expect(names).not.toContain('updateTaskTool');
    expect(names).not.toContain('travilySearchTool');
  });

  it('dbQuery 工具带只读守卫，传入写特征参数被拒绝', async () => {
    const tools = buildWhitelistTools();
    const dbq = tools.find((t) => t.tool.name === 'dbQueryTool');
    expect(dbq).toBeDefined();

    // 结构化参数 whereValue 夹带 DELETE 特征 → 守卫拒绝
    const result = (await dbq!.handler({
      table: 'notes',
      whereColumn: 'tags',
      whereValue: "x' DELETE FROM notes",
    })) as { isError?: boolean };
    expect(result.isError).toBe(true);
  });
});

describe('createHttpMcpSession (Streamable-HTTP)', () => {
  /** 解析 POST 响应体（开启 enableJsonResponse 后为纯 JSON-RPC 消息）。 */
  function parseJson(text: string) {
    const parsed = JSON.parse(text);
    // 单条响应是对象；兼容未来可能的批量响应数组
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  it('HTTP transport 完成 initialize + tools/list + tools/call', async () => {
    const sessions = new Map<string, McpHttpSession>();
    const session = await createHttpMcpSession((id, s) => sessions.set(id, s), stubTools);
    sessions.set(session.transport.sessionId ?? '', session);

    const post = (body: unknown) =>
      session.transport.handleRequest(
        new Request('http://127.0.0.1/api/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
            'MCP-Protocol-Version': '2025-03-26',
            ...(session.transport.sessionId ? { 'Mcp-Session-Id': session.transport.sessionId } : {}),
          },
          body: JSON.stringify(body),
        }),
      );
    const expectJson = async (res: Response) => {
      expect(res.status).toBe(200);
      const messages = parseJson(await res.text());
      expect(messages.length).toBeGreaterThan(0);
      return messages;
    };

    try {
      const init = await expectJson(
        await post({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' },
          },
        }),
      );
      expect(init.at(-1)?.result?.serverInfo?.name).toBe('ig-mcp');
      expect(session.transport.sessionId).toBeTruthy();

      const listed = await expectJson(
        await post({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
      );
      expect(listed.at(-1)?.result?.tools.map((t: { name: string }) => t.name)).toEqual(['echo', 'boom']);

      const called = await expectJson(
        await post({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'echo', arguments: { text: 'hi' } },
        }),
      );
      expect(called.at(-1)?.result?.content).toEqual([{ type: 'text', text: 'pong' }]);
    } finally {
      await session.transport.close();
    }
  });
});