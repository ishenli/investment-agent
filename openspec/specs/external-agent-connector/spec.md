# external-agent-connector Specification

## Purpose
由 IG 应用自身以 Streamable-HTTP MCP endpoint 的方式，将投资助手的 Service 层能力以白名单工具形式暴露给外部 CodingAgent（Codex CLI、Claude Code CLI 等），端口固定 8888，无需鉴权，仅需应用运行即提供能力。

## Requirements

### Requirement: 连接器为应用内嵌 Streamable-HTTP MCP endpoint
系统 SHALL 在 IG 应用（Next server）内以 Streamable-HTTP transport 提供 MCP endpoint（路径 `/api/mcp`），监听固定端口 8888，不要求客户端鉴权。应用启动即提供能力；应用未运行时连接失败并返回可读错误。

#### Scenario: CodingAgent 通过 url 连接
- **WHEN** 外部 CodingAgent 以 `url = http://127.0.0.1:8888/api/mcp` 方式连接
- **THEN** 连接器通过 HTTP 处理 MCP 的 `tools/list` 与 `tools/call` 请求
- **AND** 端口固定为 8888，请求响应无需携带认证凭据

#### Scenario: 应用未运行时连接失败可诊断
- **WHEN** IG 应用尚未启动而 CodingAgent 尝试连接 `127.0.0.1:8888/api/mcp`
- **THEN** 宿主收到连接失败错误（连接被拒绝）
- **AND** 错误信息能引导用户先启动 IG 应用

### Requirement: 工具按白名单暴露且默认只读
系统 SHALL 通过白名单控制对外暴露的工具集合；写操作工具默认不暴露。
白名单至少包含：笔记查询、行情查询、公司信息查询、持仓/组合查询、交易历史查询、报告查询。

#### Scenario: 列出白名单内工具
- **WHEN** 宿主 CodingAgent 请求 `tools/list`
- **THEN** 返回的工具仅包含白名单内的 Service 层能力
- **AND** 每个工具附带名称、描述与 JSON Schema 入参定义

#### Scenario: 调用白名单内工具
- **WHEN** 宿主 CodingAgent 调用某白名单工具并携带合法入参
- **THEN** 系统调用对应 Service 层方法并返回其结果

#### Scenario: 写操作工具不暴露
- **WHEN** 宿主 CodingAgent 请求 `tools/list`
- **THEN** 返回的工具列表不包含写操作工具（如新增交易、创建/更新任务）
- **AND** 对未暴露工具名的调用请求返回 MCP 错误

#### Scenario: dbQuery 工具强制只读
- **WHEN** 宿主 CodingAgent 调用 `dbQuery` 工具且 SQL 语句非 SELECT（含 INSERT/UPDATE/DELETE/ALTER/DROP 等）
- **THEN** 系统拒绝执行并向宿主返回错误结果
- **AND** 该 SQL 不产生任何数据库写入

### Requirement: 工具 schema 复用现有定义
系统 SHALL 复用 `src/server/core/agents/claude/buildTools.ts` 中已注册工具的入参定义，避免为连接器重复定义相同能力。

#### Scenario: 复用已注册工具定义
- **WHEN** 连接器注册某个已存在于 `igToolsServer` 的工具
- **THEN** 其名称、描述、入参 Schema 与既有定义保持一致

### Requirement: 提供 url 模式客户端连接配置
系统 SHALL 提供多份最小连接配置，使 Codex CLI、Claude Code CLI 等 CodingAgent 以 url 方式连接应用内嵌 MCP endpoint，无需额外操作。

#### Scenario: Codex 通过 url 连接
- **WHEN** Codex CLI 在本机运行
- **THEN** `.codex/config.toml` 中 `[mcp_servers.ig].url` 指向 `http://127.0.0.1:8888/api/mcp`
- **AND** Codex 能列出并调用连接器暴露的工具

#### Scenario: Claude Code 通过 url 连接
- **WHEN** Claude Code 在本机运行
- **THEN** `.claude/mcp.json` 中 `url` 指向 `http://127.0.0.1:8888/api/mcp`
- **AND** Claude Code 能列出并调用连接器暴露的工具

### Requirement: 工具调用失败可诊断
系统 SHALL 在工具执行失败时返回可读的错误信息，并在应用日志中记录详细异常。

#### Scenario: 工具执行失败
- **WHEN** 白名单工具的 Service 层调用抛错
- **THEN** 连接器向宿主返回 MCP `tools/call` 错误结果
- **AND** 连接器在应用日志中记录异常堆栈用于排查

### Requirement: 市场信息录入工具按用户显式要求暴露
系统 SHALL 在用户显式启用时，将「保存新的市场信息」（`asset_market_info_save` 能力）以写操作工具 `marketInfoSaveTool` 暴露给外部 CodingAgent，与默认只读白名单并存；其余写操作（新增交易、任务管理、外部搜索）仍不暴露。

#### Scenario: 外部 Agent 录入市场信息
- **WHEN** 宿主 CodingAgent 调用 `marketInfoSaveTool` 且携带合法入参（`asset_meta_ids` 指向已存在的资产元数据）
- **THEN** 系统调用资产市场信息服务保存记录并向宿主返回结果
- **AND** `tools/list` 返回该工具，且新增交易、任务管理、外部搜索工具仍不在列表中
