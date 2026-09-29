# Design

## Context

See proposal.md - Why for motivation。本设计面向"**由 IG 应用自身内嵌、Streamable-HTTP、固定端口 8888**"这一确定形态。

已核实的代码与框架事实：

- **工具 schema 可复用**：`src/server/core/agents/langchain/tools/*.ts` 中每个工具都是 `claudeTool(name, description, { zod 字段 }, async handler)` 结构（如 `noteTool.ts:45`），handler 返回 `{ content: [{ type: 'text', text }] }` —— 与 MCP `CallToolResult` 结构一致。`src/server/mcp/adapters.ts`（`toMcpTool`）、`whitelist.ts`（白名单常量）已实现并测试通过（18/18）。
- **MCP SDK 已为直接依赖**：`@modelcontextprotocol/sdk@1.30.0`（`package.json`），提供 `McpServer` 与 `StreamableHTTPServerTransport`（`.d.ts` 确认：`handleRequest(req, res, body)`）。
- **Next 16 内置 MCP 不可直接挂业务工具**：`experimental.mcpServer=true` 会启用 `/_next/mcp`，但它由 `next/dist/esm/server/mcp/get-or-create-mcp-server.js` 模块级单例承载，**硬编码注册 Next 自身工具**（compile-route、get-page-metadata、get-errors 等），不提供注册 IG 业务工具的入口。故必须自建独立 MCP route。
- **应用承载形态**：IG 应用 = Next server（dev：`next dev --port 8888`；Electron 生产：standalone `server.js`，主进程 `electron/main.ts` 通过 `utilityProcess.fork` 拉起，DB 在 `NEXT_APP_USER_DATA`）。MCP endpoint 挂进这个应用即获得完整账户上下文与真实数据，无需任何源码外进程。
- **端口固定**：8888。dev 已固定；Electron 生产需让 `PORT=8888` 生效（当前生产用随机端口）以确保 `http://127.0.0.1:8888/api/mcp` 可连。

## Goals / Non-Goals

**Goals:**

- 由 IG 应用自身（Next server 进程）提供 `GET/POST /api/mcp` Streamable-HTTP MCP endpoint，端口固定 8888。
- 复用现有 `toMcpTool` / 白名单 / `withReadOnlyGuard`，不重写业务逻辑、不重复定义 Schema。
- 以 url 模式为 Codex / Claude Code / Cursor 等提供连接配置端。
- 工具集为白名单、默认只读；写操作工具不暴露。

**Non-Goals:**

- 不做鉴权（本机默认用户）。
- 不保留独立 stdio 子进程、`bin/ig-mcp.sh` 启动器、`scripts/mcp-server.ts` 入口。
- 不改写应用内 Agent（chat/claude route）既有流程。
- 不引入 OpenAI 托管 connectors（`connector_id`）。

## Decisions

### D1. 在 Next route `src/app/api/mcp/route.ts` 挂载 Streamable-HTTP MCP server

用 `@modelcontextprotocol/sdk` 的 `Server` + `WebStandardStreamableHTTPServerTransport`（web-standard 变体，直接消费 Web `Request` 返回 Web `Response`，适配 Next route handler；SDK 1.30 已支持，无需 Node req/res 垫片）：

- `GET /api/mcp`：返回 SSE priming event（`text/event-stream` + `Mcp-Session-Id` 头）。
- `POST /api/mcp`：`transport.handleRequest(request)` 处理 `initialize` / `tools/list` / `tools/call`。
- 该 transport 为「每会话」模型：无状态实例只处理单次请求；会话需带 `sessionIdGenerator` 并 **按 `Mcp-Session-Id` 维护会话表**（每个外部 CodingAgent 一个 transport+`Server` 实例，见 `src/app/api/mcp/route.ts` 的 `sessions` map 与 `createHttpMcpSession`）。
- 开启 `enableJsonResponse: true`：白名单工具全部是同步请求/响应，POST 直接以 `application/json` 返回结果，避免外部 CodingAgent 消费 SSE 流式响应时截断（`-32603 did not complete`）。GET SSE priming 不受影响。
- 在模块初始化时 `await DatabaseManager.getInstance().initialize()`（应用内 instrumentation 已做，route 直接复用现成 Service 层）。

**为何不用 Next 内置 `/_next/mcp`**：内置 server 注册 Next 自身工具且硬编码（见 Context），无法挂 IG 业务工具。自建 route 用已声明的 SDK，完全自控。

**替代考虑**：独立 stdio 子进程（既有实现）—— 已按用户决定废弃，因为只下载 Electron 应用的用户没有源码文件。

### D2. 工具注册：复用现有适配层

将现有 `buildWhitelistTools()` 的结构接入 `McpServer.registerTool()`：读 `claudeTool` 的 name/description/inputSchema 转 MCP `Tool`，handler 直接透传（返回 `{ content: [{ type: 'text', text }] }` 与 `CallToolResult` 结构一致）。白名单仍为单一常量数组，`dbQueryClaudeTool` 经 `withReadOnlyGuard` 包装。

### D3. 白名单默认只读

沿用既有清单：
`noteQueryClaudeTool`、`stockRecallMarketInfoClaudeTool`、`stockRecallCompanyInfoClaudeTool`、`stockSearchNewsClaudeTool`、`stockGetPriceClaudeTool`、`searchAssetInfoClaudeTool`、`accountBalanceClaudeTool`、`transactionHistoryClaudeTool`、`transactionHistoryByDateClaudeTool`、`transactionSummaryClaudeTool`、`dbQueryClaudeTool`（**只读守卫**）。

**dbQuery 只读约束**：非 SELECT 语句拒绝执行（adapter 层拦截）。

**明确排除**：`addTransactionClaudeTool`、任务三件套（`createTask/listTasks/updateTask`）、`TravilySearchClaudeTool`。

### D4. 客户端以 url 模式连接

- `.codex/config.toml`：
  ```toml
  [mcp_servers.ig]
  url = "http://127.0.0.1:8888/api/mcp"
  ```
- `.claude/mcp.json`：
  ```json
  { "mcpServers": { "ig": { "url": "http://127.0.0.1:8888/api/mcp" } } }
  ```
- `.cursor/mcp.json`、`.github/mcp.json`、`mcp_config.json` 同理。

CodingAgent 无需任何源码或启动器——应用在 8888 上运行即可连接。

## Risks / Trade-offs

- **[8046/8888 端口冲突]** → dev 固定 8888（现有脚本已占用该约定）；若本机另有服务占用 8888 需改端口并同步配置，文档中说明。
- **[Electron 生产随机端口问题]** → 生产模式当前 `getPort()` 随机选端口，需改为固定 `PORT=8888` 注入 standalone 进程，否则 url 连接不成立。
- **[dbQuery 的 SQL 注入/越权风险]** → handler 层 SELECT-only 守卫；写库语句任何情况不执行。
- **[写操作工具被边缘绕过]** → 白名单集中管理，`tools/list` 永不返回名单外工具；未注册工具名调用返回错误。
- **[MCP SDK 版本漂移]** → `@modelcontextprotocol/sdk` 锁定 1.30.0；其 `StreamableHTTPServerTransport` 与 `McpServer` 接口在 2.x 可能调整，升级前需回归。

## Migration Plan

1. 新增 `src/app/api/mcp/route.ts`：挂载 `McpServer` + `StreamableHTTPServerTransport`，注册白名单工具，`GET`/`POST` 处理。
2. 复用 `src/server/mcp/` 的适配器与白名单（当前 `server.ts` 的 stdio 组装改为 HTTP 组装或拆分）。
3. dev 固定 `PORT=8888` 验证 `http://127.0.0.1:8888/api/mcp`；Electron 生产注入固定 PORT。
4. 更新 `.codex/config.toml` 等 5 处为 url 模式。
5. 删除 `scripts/mcp-server.ts`、`bin/ig-mcp.sh`、package.json `"mcp-connector"` 脚本。
6. 手工验证：`pnpm dev` 后，Codex/Claude Code 以 url 连接，`tools/list` 只含白名单、`tools/call` 只读工具可用、应用停止时连接失败可读。

**回滚**：删除 `src/app/api/mcp/route.ts` 及 url 配置，恢复 `bin/ig-mcp.sh` 与 stdio 配置即可——MCP endpoint 为纯新增能力，不改既有路径。

## Open Questions

- Electron 生产固定 PORT=8888 的具体注入点（`electron/main.ts` env 或 standalone build 配置）——实现时确认，不改变 specs/approach。