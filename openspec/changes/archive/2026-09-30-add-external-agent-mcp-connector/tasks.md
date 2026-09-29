# Tasks

> 注：本 change 已从「独立 stdio 进程」改写为「应用内嵌 Streamable-HTTP MCP endpoint」，原有 stdio 实现（scripts/mcp-server.ts、bin/ig-mcp.sh）将被移除，适配层（adapters/whitelist）与已通过的测试（18/18）继续复用。

## 1. 应用内嵌 MCP endpoint

- [x] 1.1 新增 `src/app/api/mcp/route.ts`：用 `@modelcontextprotocol/sdk` 的 `McpServer` + `StreamableHTTPServerTransport` 挂载 IG 业务 MCP server；实现 `GET`（SSE priming）与 `POST`（`handleRequest`）处理；验证 `pnpm dev`（固定 8888）下 `GET /api/mcp` 返回可用的 SSE priming 响应
- [x] 1.2 将现有 `src/server/mcp/server.ts` 的 stdio 组装改为 HTTP 组装（`registerTools` 复用 `buildWhitelistTools()`），保留 `toMcpTool` / `withReadOnlyGuard` / 白名单不变；验证 `POST /api/mcp` 完成 `initialize` + `tools/list` 返回 11 个白名单工具
- [x] 1.3 端口固定验证：dev 模式以 `PORT=8888` 运行，CodingAgent url `http://127.0.0.1:8888/api/mcp` 可发现并列出工具；IG 应用停止时 url 连接返回可读的「连接被拒绝」错误

## 2. 客户端 url 模式配置

- [x] 2.1 更新 `.codex/config.toml`：`[mcp_servers.ig]` 从 `command` 改为 `url = "http://127.0.0.1:8888/api/mcp"`，验证 `codex mcp list` 能发现该 server
- [x] 2.2 更新 `.claude/mcp.json`、`.cursor/mcp.json`、`.github/mcp.json`、`mcp_config.json` 为 url 模式并验证 JSON 合法
- [x] 2.3 端到端验收：本机运行 IG 应用后，分别用 Codex 与 Claude Code 以 url 连接，调用 `transactionHistoryTool`（查询交易历史）成功返回；调用 `dbQuery` 传非 SELECT 语句被拒绝

## 3. 移除独立进程遗留

- [x] 3.1 删除 `scripts/mcp-server.ts`、`bin/ig-mcp.sh`，以及 package.json `"mcp-connector"` 脚本；验证 `pnpm types:check` 无残留引用
- [x] 3.2 移除或归档原 stdio 专用逻辑（`scripts/mcp-server.ts` 的 `PROJECT_DIR` 强改与启动器不再需要）

## 4. 文档与收尾

- [x] 4.1 更新 README「外部 CodingAgent 连接」小节：改为「启动 IG 应用后，CodingAgent 以 `http://127.0.0.1:8888/api/mcp` url 连接」，移除 sh 启动器与独立进程说明，新增端口冲突与 Electron 生产 PORT 说明
- [x] 4.2 全量回归：`pnpm types:check`、`pnpm test` 通过（含既有 MCP 适配层测试 18/18），且既有 chat/claude 流程不受影响（`buildTools.ts` 未改动）
- [x] 4.3 Electron 生产固定 PORT=8888：确认 standalone server 以固定端口运行（注入 `PORT=8888`），url 连接在打包应用下可用

## 5. 市场信息录入暴露（用户显式要求）

- [x] 5.1 将「保存新的市场信息」（`asset_market_info_save` 能力）包装为 MCP 白名单工具 `marketInfoSaveTool`（懒加载复用 `MarketBizController.saveMarketInfo`，保持与内置能力同源），注册进 `whitelist.ts`；验证 `tools/list` 返回该工具且实际调用可录入一条市场信息（`asset_meta_ids` 需指向已存在的资产元数据）
- [x] 5.2 设置页新增 MCP 专属页面（`/setting/mcp`，侧边栏导航「MCP 设置」）：展示 endpoint 连接信息（url/端口/运行状态）、白名单工具列表（含写操作与只读守卫标注）与各 CodingAgent 配置文件对应关系；数据来自新增 `/api/mcp/info` 接口（复用 `buildWhitelistTools`）