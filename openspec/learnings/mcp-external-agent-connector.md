---
name: mcp-external-agent-connector
description: 外部 CodingAgent 通过 IG 应用内嵌的 Streamable-HTTP MCP endpoint 连接时的架构约束——transport 选型、Mcp-Session-Id 会话表与 404 语义、同步工具 JSON 响应、固定端口 8888、数据归属
type: project
related:
  - change:add-external-agent-mcp-connector
---

# MCP 外部 CodingAgent 连接器架构约束

## 不变式（当下为真）

- IG 对外提供**应用内嵌**的 Streamable-HTTP MCP endpoint：`http://127.0.0.1:8888/api/mcp`，
  dev 与 Electron 生产**固定端口 8888**（`next dev --port 8888`；Electron 主进程注入 `PORT=8888`，不用随机端口）。
- 使用 SDK 的 `WebStandardStreamableHTTPServerTransport`，**不用 Node 变体 `StreamableHTTPServerTransport`**：
  Next route handler 只给 Web `Request`/`Response`（Node 变体需要 req/res 垫片）；
  且无状态实例**单次请求后不可复用**（SDK 抛 “Stateless transport cannot be reused across requests”）。
- 会话是「每客户端」模型：进程内按 `Mcp-Session-Id` 维护会话表（transport + `Server` 每会话一个）。
  **未知/过期 session id 返回 404 “Session not found”**，让客户端重新初始化；
  否则新建未初始化会话会把 tools/list 变成 400 “Server not initialized”，客户端无法自愈。
- 同步请求/响应工具开启 `enableJsonResponse=true`，POST 直接回 JSON：
  (a) 白名单工具全是同步结果，无流式需求；
  (b) 外部 CodingAgent 消费 SSE 响应会截断，报 `-32603 MCP tool invocation did not complete`。
  GET SSE priming 保持不变。
- 客户端 `Accept` 必须**同时**包含 `application/json` 与 `text/event-stream`，否则 406。
- **无鉴权**（本机默认用户）；工具按白名单暴露，`src/server/mcp/whitelist.ts` 单点维护，
  写操作默认不暴露，例外由用户显式启用（如 `marketInfoSaveTool` 市场信息录入）。
- **数据/DB 归属「正在运行的应用实例」**（项目目录 `sqlite.db` 或 Electron `userData`），
  没有独立进程路径，不与具体 checkout 的 DB 绑定。

## 为什么（防止走错）

- 曾因外部 Agent 会话在服务重启后失效（内存会话表清空）而持续 400、拿不到工具列表，靠 404 重连语义修复。
- 曾因 POST 回 SSE 流导致外部 Agent 报 -32603，靠 `enableJsonResponse` JSON 响应修复。
- 曾考虑 Node 变体 transport，因与 Next route handler 不匹配而弃用。

## 影响范围

未来涉及：新增/更换 MCP transport、鉴权、端口或 Electron 打包、另一类外部 Agent 集成、白名单工具增删。

## 证据

- E2E：initialize + tools/list（12 工具）+ tools/call（`dbQueryTool` 61 行、`transactionHistoryTool`、`marketInfoSaveTool` 录入 id 54）；stale session → 404 → 重连恢复；JSON 响应。
- `pnpm types:check`、MCP 测试 18/18、全量 883 通过、eslint/prettier 通过。