/**
 * MCP 信息查询接口（供设置页展示）
 *
 * 返回应用内嵌 MCP endpoint 的连接信息、白名单工具与各 CodingAgent 配置说明，
 * 数据源与运行层一致（buildWhitelistTools / 固定端口 8888）。
 *
 * 设计依据 design.md - D4、specs - external-agent-connector。
 */
import { buildWhitelistTools } from '@server/mcp/whitelist';

// 固定端口约定与文档一致：dev `next dev --port 8888`、Electron 生产 `PORT=8888`
const MCP_ENDPOINT = {
  url: 'http://127.0.0.1:8888/api/mcp',
  port: 8888,
} as const;

// 与仓库根各配置文件的对应关系（url 模式）
const CONFIG_FILES = [
  { app: 'OpenAI Codex CLI', file: '.codex/config.toml' },
  { app: 'Anthropic Claude Code', file: '.claude/mcp.json' },
  { app: 'Cursor', file: '.cursor/mcp.json' },
  { app: 'GitHub Copilot', file: '.github/mcp.json' },
  { app: 'Google Antigravity', file: 'mcp_config.json' },
] as const;

export function GET() {
  // 仅取 Tool 声明（name/description/inputSchema），不触发 handler
  const tools = buildWhitelistTools().map((t) => t.tool);
  return Response.json({
    endpoint: MCP_ENDPOINT,
    tools,
    configFiles: CONFIG_FILES,
  });
}