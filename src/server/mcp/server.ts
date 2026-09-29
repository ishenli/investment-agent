/**
 * MCP Connector Server 组装
 *
 * 用 MCP SDK 的 Server + WebStandardStreamableHTTPServerTransport 注册白名单工具，
 * 由 IG 应用自身（Next server）以 Streamable-HTTP 暴露给外部 CodingAgent
 * （Codex / Claude Code），不再使用独立 stdio 子进程。
 *
 * Streamable-HTTP 的 web-standard transport 为「每个会话」一个实例：
 * 初始化请求携带新生成的 session id，后续请求按 Mcp-Session-Id 路由到对应会话。
 * route 层持有一个会话表，见 src/app/api/mcp/route.ts。
 *
 * 设计依据 design.md - D1 / D2、specs - external-agent-connector。
 */
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { buildWhitelistTools } from './whitelist';
import type { McpToolWithHandler } from './adapters';

/** 构建并返回已挂载请求处理器的 MCP Server。 */
export function createMcpServer(tools: McpToolWithHandler[] = buildWhitelistTools()): Server {
  const server = new Server(
    { name: 'ig-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  const toolByName = new Map(tools.map((t) => [t.tool.name, t.handler]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => t.tool),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = toolByName.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return handler((args as Record<string, unknown>) ?? {});
  });

  return server;
}

/** 一个外部 CodingAgent 会话：transport + 其独占的 Server。 */
export interface McpHttpSession {
  server: Server;
  transport: WebStandardStreamableHTTPServerTransport;
}

/**
 * 创建一个 Streamable-HTTP 会话（transport + server）。
 *
 * 无状态 transport 只能处理单次请求，不能复用；故每个会话独立实例，
 * 初始化时生成 session id 并通过 `register` 回调交还给调用方（会话表）。
 * 客户端后续请求携带 Mcp-Session-Id 头，route 层据此路由到同一会话。
 */
export async function createHttpMcpSession(
  register: (sessionId: string, session: McpHttpSession) => void,
  tools: McpToolWithHandler[] = buildWhitelistTools(),
  onSessionClosed?: (sessionId: string) => void,
): Promise<McpHttpSession> {
  const server = createMcpServer(tools);
  // 显式类型注解：onsessioninitialized 回调引用自身，需要注解打破循环推断
  const transport: WebStandardStreamableHTTPServerTransport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    // 所有白名单工具都是同步请求/响应，POST 直接以 JSON 返回结果，
    // 避免外部 CodingAgent 消费 SSE 流式响应时截断（-32603 did not complete）。
    enableJsonResponse: true,
    // 初始化请求在 createHttpMcpSession 返回后才被 handleRequest 处理，const 已就绪
    onsessioninitialized: (sessionId) => register(sessionId, { server, transport }),
    onsessionclosed: onSessionClosed,
  });
  await server.connect(transport);
  return { server, transport };
}