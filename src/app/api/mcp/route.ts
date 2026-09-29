/**
 * IG 应用内嵌 MCP endpoint（Streamable-HTTP）
 *
 * 将投资助手 Service 层能力以白名单工具形式暴露给外部 CodingAgent
 * （Codex / Claude Code / Cursor），复用 src/server/mcp 的适配层与白名单，
 * 不重写业务逻辑。监听固定端口 8888，无需鉴权，应用启动即提供能力。
 *
 * Streamable-HTTP 是「每会话」连接：初始化请求生成 session id，后续请求按
 * Mcp-Session-Id 头路由到同一会话。这里持有进程内会话表（本机单用户，重启即失效，
 * 客户端会自动重新初始化）。
 *
 * 未知/过期 session id → 返回 404 Session not found（而非新建一个未初始化会话），
 * 按 MCP 规范让客户端放弃旧会话并重新初始化。
 *
 * 设计依据 design.md - D1、specs - external-agent-connector。
 */
import type { NextRequest } from 'next/server';

import { createHttpMcpSession } from '@server/mcp/server';
import type { McpHttpSession } from '@server/mcp/server';

// 会话表：sessionId -> 会话（transport + server）。进程内内存态，本机单用户足够。
const sessions = new Map<string, McpHttpSession>();

/** 按 Mcp-Session-Id 取已存会话；未知 id 返回 404 以触发客户端重新初始化；新连接则创建会话。 */
async function sessionFor(request: NextRequest): Promise<McpHttpSession | Response> {
  const sessionId = request.headers.get('mcp-session-id');
  if (sessionId) {
    const existing = sessions.get(sessionId);
    if (existing) {
      return existing;
    }
    return Response.json(
      { jsonrpc: '2.0', error: { code: -32001, message: 'Session not found' }, id: null },
      { status: 404 },
    );
  }
  return createHttpMcpSession(
    (id, session) => sessions.set(id, session),
    undefined,
    (id) => sessions.delete(id),
  );
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await sessionFor(request);
  return session instanceof Response ? session : session.transport.handleRequest(request);
}

export async function POST(request: NextRequest) {
  const session = await sessionFor(request);
  return session instanceof Response ? session : session.transport.handleRequest(request);
}