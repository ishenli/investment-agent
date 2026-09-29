# Proposal

## Why

投资助手的 Service 层沉淀了大量可复用能力（行情、持仓、交易历史、笔记、报告、任务等），但只能通过应用内 Agent 调用。外部 CodingAgent（Codex CLI、Claude Code CLI、Cursor 等）无法直接使用这些能力，导致"应用数据/能力"与"外部编码智能体"之间是断开的。通过**作为 IG 应用自身能力的内嵌 MCP endpoint**，让只下载了 Electron 应用的用户、及开发环境中的 CodingAgent，都能以零配置方式直接调用 IG 服务能力。

## What Changes

- 在 IG 应用（Next server）内新增一个 **Streamable-HTTP MCP endpoint（`/api/mcp`）**，端口固定 **8888**，作为应用自身能力向外部 CodingAgent 暴露白名单工具。
- 复用 `src/server/core/agents/langchain/tools/*.ts` 中已有的工具 schema（`igToolsServer` 聚合），以及现有的 `src/server/mcp/adapters.ts` / `whitelist.ts` 适配层，不重写业务逻辑。
- CodingAgent 以 **url（远程 MCP）模式**连接 `http://127.0.0.1:8888/api/mcp`：`.codex/config.toml` 用 `url` 字段、`.claude/mcp.json` 用 `url` 字段。
- **移除**独立进程方案：删除 `scripts/mcp-server.ts` 入口、`bin/ig-mcp.sh` 启动器、以及 5 处 `command`（stdio）配置的启动项，改为 url 声明。
- 工具集以**只读为主**（白名单），写操作工具（如 `addTransaction`、`createTask`）默认不暴露，延续此前"不全量透出 API"的教训。

**明确不做**：不做鉴权（本机默认用户）、不做 OpenAI 托管 `connector_id` 连接器、不改写应用内部 Agent 流程、不使用独立子进程承载连接器。

## Capabilities

### New Capabilities

- `external-agent-connector`: 由 IG 应用自身以 Streamable-HTTP endpoint 提供 MCP server，将 Service 层能力以白名单工具形式暴露给外部 CodingAgent（Codex / Claude Code / Cursor），含工具注册、HTTP route 与客户端 url 连接配置。

### Modified Capabilities

<!-- 无：现有 capability 的需求行为不变，均为新增能力 -->
（none）

## Impact

- **新增代码**：`src/app/api/mcp/route.ts`（HTTP MCP endpoint）+ 复用 `src/server/mcp/`（适配器、白名单、server 组装）。
- **依赖**：沿用已声明的 `@modelcontextprotocol/sdk`（唯一新增运行时依赖，版本 1.30.0）。
- **配置**：`.codex/config.toml`、`.claude/mcp.json`、`.cursor/mcp.json`、`.github/mcp.json`、`mcp_config.json` 改为 `url = "http://127.0.0.1:8888/api/mcp"`；移除 `bin/ig-mcp.sh` 与 `scripts/mcp-server.ts` 及 `"mcp-connector"` npm 脚本。
- **端口**：dev 固定 8888（`next dev --port 8888` 已有）；Electron 生产模式需固定 `PORT=8888`，确保 url 连接可用。
- **受影响系统**：无既有行为变更；应用内 Agent、chat 流程、Electron 主进程均不受影响，MCP endpoint 为纯新增能力。