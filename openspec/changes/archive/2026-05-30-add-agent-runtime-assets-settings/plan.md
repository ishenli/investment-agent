# 实现计划：Agent Runtime Assets Settings

**分支**：`feat/agent` | **日期**：2026-05-30 | **规范**：`openspec/changes/add-agent-runtime-assets-settings/specs`
**输入**：升级 `/setting/agent`，展示并编辑 Claude Code 与 Hermes Agent 的 Memory、User.md 文件。

## 概要

将现有智能体设置页从"数据库 Agent metadata 管理页"升级为"Agent 运行时资源文件编辑器"。页面直接展示 Claude Code 与 Hermes Agent 的 Memory 和 User Profile 文件，用户可查看和编辑这些 Markdown 文件。不包含数据库 Agent profile 管理（已移除）和 Skill 编辑（由 `/setting/skills` 独立管理）。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, Tailwind CSS, Drizzle ORM, Zod
**存储**：文件系统（`MEMORY.md`、`USER.md`/`User.md`）
**测试**：Vitest, React Testing Library
**目标平台**：桌面 Web（Electron + Web）
**项目类型**：Next.js App Router（Client settings page + Node.js API routes）
**性能目标**：运行时资源列表读取 < 1s；单文件保存 < 1s。
**约束条件**：必须兼容 Electron；Electron 下所有可写运行时资源必须位于 `NEXT_APP_USER_DATA` / `getProjectRoot()` 下的 userData 目录；文件读写必须限制在服务端允许的项目/用户工作区目录；不得允许任意路径写入。

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-agent-runtime-assets-settings/
├── proposal.md
├── plan.md
├── tasks.md
└── specs/
    ├── agent-management/
    │   └── spec.md
    └── hermes-agent/
        └── spec.md
```

### 源代码（项目根目录）

```text
src/
├── app/
│   ├── (pages)/setting/agent/
│   │   ├── page.tsx
│   │   └── components/
│   │       ├── index.ts
│   │       ├── AgentRuntimeAssetsView.tsx
│   │       └── RuntimeAssetEditor.tsx
│   └── api/
│       └── agent/runtime-assets/route.ts
├── server/
│   ├── service/
│   │   └── agentRuntimeAssetService.ts
│   └── controller/
│       └── agentRuntimeAsset.ts
└── types/
    └── agentRuntimeAsset.ts
```

**结构决策**：`/setting/agent` 页面直接渲染 `AgentRuntimeAssetsView`，无需 Tabs 包裹。新增 `agentRuntimeAssetService` 作为薄服务层，负责枚举 Claude/Hermes runtime 文件和执行受控读写。

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 用户能在 Agent 设置页按 Agent runtime 规范查看 Claude Code 与 Hermes Agent 的 Memory/User 文件 | 打开 `/setting/agent`，默认看到运行时资源视图，切换运行时和资源类型后看到当前 Markdown 内容 |
| P2 | 用户能编辑并保存 Memory/User 文件 | 修改 Markdown，保存成功后刷新页面仍显示新内容，运行时下一次调用读取新内容 |

## 技术架构

### 数据流
```text
Settings UI
  → AgentRuntimeAssetsView
  → GET /api/agent/runtime-assets?runtime=claude|hermes
  → AgentRuntimeAssetController
  → AgentRuntimeAssetService
  → allowlisted file resolver
  → file content / metadata response

Settings UI
  → RuntimeAssetEditor save
  → PUT /api/agent/runtime-assets
  → Zod validation
  → AgentRuntimeAssetService.saveAsset()
  → atomic file write
```

### 状态管理
- **服务端**：文件系统为 Memory/User 内容源。
- **客户端**：Agent 设置页局部 state 管理 runtime tab、selected asset、dirty state、saving state；不需要全局 Zustand。
- **缓存策略**：资源列表可在页面内缓存；保存后重新获取该资源。

### 外部集成
- **Claude Code**：使用 `ClaudeService.getUserWorkspaceRoot(userId)` 解析用户工作区，读取根目录下的 `CLAUDE.md`、`User.md`/`USER.md` 等受支持资源。Electron 下该根目录为 `${NEXT_APP_USER_DATA}/workspace/{userId}`。
- **Hermes Agent**：使用 Hermes memory directory 配置或项目默认 runtime memory directory，读取 `MEMORY.md` 和 `USER.md`。Electron 下默认目录为 `${NEXT_APP_USER_DATA}/workspace/{userId}/.hermes/memories`。
- **数据库**：无需新增表。

## 复杂性跟踪

| 违规 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 新增 runtime asset API | 前端不能直接安全读写本地文件，且需要服务端路径白名单 | 直接暴露任意文件路径会造成路径穿越和误写项目文件风险 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 任意路径写入 | 高 | API 只接受 runtime、asset type、slug 等逻辑 ID，服务端解析到白名单目录 |
| 保存时覆盖 Agent 自动写入的 Memory | 中 | 返回 `updatedAt`/hash，保存时进行可选冲突检测；失败时提示用户重新加载 |
| 大型文件编辑卡顿 | 低 | 限制单文件大小，超限只读并提示 |

## 安全考虑

- 所有 API 必须校验登录用户。
- 文件路径必须由服务端根据 userId/runtime/type/slug 解析，禁止客户端提交路径。
- Electron packaged resources 只可作为 bundled/default source 读取；用户编辑必须写入 userData 下的 per-user workspace。
- 保存内容限制为 UTF-8 Markdown 文本，拒绝二进制和超大文件。

## 测试策略

- **单元测试**：runtime asset resolver 的路径白名单、文件读取、原子写入、大小限制。
- **集成测试**：`GET/PUT /api/agent/runtime-assets` 内容读写。
- **组件测试**：运行时资源 tab、dirty state、保存/取消、错误态。
- **手工验证**：启动应用，打开 `/setting/agent`，编辑 Memory/User 并确认刷新后持久化。
