# Change: 为 Hermes Agent 引入权限系统（PermissionSystem）

## Why

当前 Hermes Agent 的工具执行层没有任何权限控制。模型可以通过 `terminal` 执行任意命令（如 `rm -rf /`）、通过 `patch` 修改任意文件、通过 `add_transaction` 添加交易记录——所有操作默认自动执行，不存在权限分级或确认拦截。这导致实质性的 RCE、任意文件写入和数据操作风险（详见 GitHub Issue #78）。

需要引入一套**集中式权限系统**，让工具的安全策略由全局策略矩阵统一管理，而非每个工具自己决定，从而降低维护复杂度并支持运行时动态调整。

## What Changes

- **引入 PermissionSystem**：
  - `PermissionLevel` 定义 3 个权限档位：`safe`、`auto`、`full-access`
  - `ToolCategory` 定义 4 个工具分类：`read`、`write`、`system`、`finance`
  - `PermissionPolicy` 实现策略矩阵（`level × category` → `auto` / `confirm` / `deny`）

- **权限档位说明**：
  - **Safe（安全模式）**：最严格，所有操作都需要用户确认
  - **Auto（自动模式，默认）**：读/写操作自动执行，系统/金融操作需要确认
  - **Full Access（完全访问）**：所有操作自动执行，ContentGuard 仍然生效

- **工具注册引入 `ToolCategory`**：每个工具注册时只需标注一个分类（`read`/`write`/`system`/`finance`），策略矩阵自动决定执行策略。
- **分层安全架构**：
  - **Layer 1 — PermissionSystem**：按权限级别决定工具是否允许执行
  - **Layer 2 — ContentGuard**：对 `terminal`/`patch` 等工具做内容级安全过滤（命令黑名单、路径白名单），即使权限允许也做最后一层检查
  - **Layer 3 — Confirmation**：策略矩阵输出 `confirm` 时，loop 暂停并回调 `onConfirmationRequest`
- **审计日志**：在 PermissionSystem + ContentGuard 的决策点记录日志（fire-and-forget）。

**BREAKING**：
- `AgentConfig` 新增 `permissionLevel` 字段（默认 `auto`）
- `ToolRegistry.register()` 新增可选的 `category` 参数，用于标注工具的权限分类
- `AgentCallbacks` 新增可选的 `onConfirmationRequest` 回调
- `db_query` 工具的 `ToolCategory` 标为 `system`（高风险），在 `safe` 权限下需要确认

**NOT included（后续 change）**：
- Docker 沙箱隔离 → P1 后续
- 成本熔断机制 → P1 后续
- 持久化审计日志（写入数据库/文件） → P1 后续，当前仅 console 输出

## Impact

- Affected specs: `agent-management`
- Affected code:
  - `packages/hermes-agent/src/permission/`（新增）
  - `packages/hermes-agent/src/guard/content-validator.ts`（新增）
  - `packages/hermes-agent/src/tools.ts`（`register()` 扩展 category，接入 PermissionPolicy）
  - `packages/hermes-agent/src/loop.ts`（权限检查 + 确认中断 + 内容守卫注入）
  - `packages/hermes-agent/src/types.ts`（新增 PermissionLevel、ToolCategory 等类型）
  - `packages/hermes-agent/src/index.ts`（导出 permission 公共 API）
  - `packages/hermes-agent/src/builtin-tools/`（为每个内置工具标注 `ToolCategory`）
  - `src/server/core/agents/hermes/registerBusinessTools.ts`（为每个业务工具标注 `ToolCategory`）
