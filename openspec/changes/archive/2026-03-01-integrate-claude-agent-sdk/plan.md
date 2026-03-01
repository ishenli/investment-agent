# 实现计划：Claude SDK UI 集成与服务层优化

**分支**：`feature/claude-sdk-integration` | **日期**：2026-02-27 | **规范**：[proposal.md](./proposal.md)
**输入**：来自 `/openspec/changes/integrate-claude-agent-sdk/` 的变更提案

## 概要

在现有 Chat 系统中集成 Claude SDK,提供引擎选择器允许用户在 DeepAgents 和 Claude SDK 之间切换。同时创建统一的 ClaudeService 服务层,避免配置逻辑重复。核心实现分为两个阶段:
1. **Phase 1**: ClaudeService 服务层 + 重构 reportService
2. **Phase 2**: UI 引擎选择器 + 动态 API 路由

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, @anthropic-ai/claude-agent-sdk (已添加), @anthropic-ai/sdk
**存储**：SQLite (Drizzle ORM)
**测试**：Vitest
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：流式响应无阻塞,配置获取高效
**约束条件**：必须兼容现有 Chat 系统和 DeepAgents,不破坏现有功能

## 规范检查

- [x] 检查是否符合项目规范 (CLAUDE.md)
- [x] 检查 TypeScript 严格模式约束
- [x] 检查 OpenSpec delta 格式正确性

## 项目结构

### 文档（此功能）

```text
openspec/changes/integrate-claude-agent-sdk/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── claude-chat/
        └── spec.md          # Delta 变更
```

### 源代码（项目根目录）

```text
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── claude/
│   │           └── route.ts           # 已存在：Claude SDK API
│   ├── lib/
│   │   └── claude-client.ts          # 已存在：streamClaude 函数
│   └── (pages)/
│       └── chat/
│           ├── modules/Workspace/Conversation/features/
│           │   └── ChatInput/
│           │       └── Desktop/
│           │           └── EngineSelector.tsx  # 新增：引擎选择器
│           ├── store/
│           │   ├── chat/slices/aiChat/actions/
│           │   │   └── generateAIChat.ts      # 修改：动态路由
│           │   └── session/slices/session/
│           │       └── action.ts              # 修改：engineType 字段
│           └── services/
│               └── chat.ts                    # 修改：支持 Claude API
├── server/
│   ├── service/
│   │   ├── claudeService.ts                   # 新增：Claude 服务层
│   │   └── reportService/
│   │       └── index.ts                       # 修改：使用 claudeService
│   └── repository/
│       └── chat/
│           └── skill.ts                       # 未来：Skills Repository
├── types/
│   └── claude.ts                              # 已存在：Claude 类型定义
└── drizzle/
    └── schema.ts                              # 可选：engineType 字段
```

**结构决策**:
- ✅ 复用已有的 `streamClaude` 和 `/api/chat/claude`,无需重新实现
- ✅ ClaudeService 放在 `src/server/service/`,与其他服务层对齐
- ✅ 引擎选择器放在 ChatInput 组件内,遵循现有结构
- ✅ Skills 和 MCP Server 作为未来功能,本次不实现

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P0 | 作为开发者,我需要统一的 ClaudeService 避免配置代码重复 | ClaudeService 单元测试通过,reportService 成功重构 |
| P1 | 作为用户,我可以在 Chat 中选择使用 DeepAgents 或 Claude SDK | 切换引擎选择器,验证调用不同 API 端点 |
| P2 | 作为用户,我的引擎选择会在会话级别持久化 | 刷新页面或切换会话后,引擎选择保持不变 |
| P3 | 作为用户,我可以导入和管理 Skills 知识包 (未来) | 上传 SKILL.md,在会话中启用,验证生效 |
| P4 | 作为用户,我可以配置 MCP Servers 扩展能力 (未来) | 添加 MCP Server 配置,验证工具可用 |

## 技术架构

### 数据流

**Phase 1: ClaudeService**
```
[reportService / API] 
       ↓
[claudeService.getClaudeConfig(modelSlug?)]
       ↓
[modelProviderResolver] → 获取 Provider 配置
       ↓
[构建 ApiProvider 对象]
       ↓
[返回给调用方]
```

**Phase 2: UI 引擎选择器**
```
[用户选择引擎]
       ↓
[更新 Session Config: engineType]
       ↓
[用户发送消息]
       ↓
[根据 engineType 选择 API]
  ├─ deepagents → /api/chat/agent
  └─ claude → /api/chat/claude
       ↓
[streamClaude 执行]
       ↓
[SSE 流式返回]
```

### ClaudeService 架构

```typescript
// src/server/service/claudeService.ts
export class ClaudeService {
  /**
   * 获取 Claude SDK 配置
   * @param modelSlug - 可选的模型标识
   * @returns Claude 配置对象 { modelSlug, provider }
   */
  async getClaudeConfig(modelSlug?: string): Promise<ClaudeConfig>

  /**
   * 获取环境变量格式的配置 (用于 Claude Agent SDK)
   * @param modelSlug - 可选的模型标识
   * @returns 包含 ANTHROPIC_API_KEY 和 ANTHROPIC_BASE_URL 的配置
   */
  async getEnvConfig(modelSlug?: string): Promise<{
    modelSlug: string;
    env: Record<string, string | undefined>;
  }>

  /**
   * 验证配置完整性
   */
  private validateConfig(provider: ApiProvider): void
}

// 使用示例
const config = await claudeService.getClaudeConfig('claude-3-5-sonnet-20241022');
// config = { modelSlug: 'claude-3-5-sonnet-20241022', provider: ApiProvider }
```

### 状态管理

- **服务端**:
  - Provider 配置通过 `modelProviderResolver` 管理
  - 会话配置存储在 `chat_sessions.config` (添加 `engineType` 字段)
- **客户端**:
  - `sessionStore`: 会话级别的引擎类型配置
  - `chatStore`: 消息发送和 API 路由选择

### 外部集成

- **Claude SDK**: `@anthropic-ai/claude-agent-sdk` (已添加)
- **streamClaude**: 已实现的 Claude SDK 封装函数
- **modelProviderResolver**: 统一的 Provider 配置管理
- **流式响应**: SSE over HTTP

## Schema 变更

### chat_sessions.config 扩展 (JSON 字段,可选)

```typescript
interface SessionConfig {
  // ... 现有字段
  engineType?: 'deepagents' | 'claude';  // 新增: AI 引擎类型
  
  // Claude SDK 专用配置 (未来功能)
  claudeConfig?: {
    skills?: string[];       // 启用的 Skill slugs
    mcpServers?: string[];   // 启用的 MCP Server IDs
    permissionMode?: 'default' | 'acceptEdits' | 'dontAsk';
    maxBudgetUsd?: number;   // 预算限制
  };
}
```

**注意**: 
- `engineType` 字段可以先在应用层实现,暂不修改数据库 schema
- 会话配置本身是 JSON 字段,无需迁移即可添加新字段

## 复杂性跟踪

| 变更 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 新增 ClaudeService | 避免在多个服务中重复 Provider 配置逻辑 | 让每个服务自己获取配置会导致代码重复和维护困难 |
| UI 引擎选择器 | 让用户可以选择最适合的 AI 引擎 | 硬编码使用单一引擎无法满足不同场景需求 |
| engineType 配置字段 | 会话级别持久化引擎选择 | 每次都重新选择会影响用户体验 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 打破现有 DeepAgents 功能 | 高 | 完全独立的代码路径,两个引擎互不干扰 |
| API 路由选择逻辑出错 | 中 | 详细的单元测试和端到端测试 |
| Provider 配置获取失败 | 中 | ClaudeService 中添加详细的错误处理和日志 |
| UI 组件性能问题 | 低 | 引擎选择器是简单的下拉菜单,性能开销可忽略 |

## 性能考虑

- **ClaudeService 配置获取**: 复用 modelProviderResolver 的缓存机制
- **API 路由选择**: 在内存中判断,无额外开销
- **流式响应**: 保持现有 SSE 机制,无性能回退
- **会话配置**: JSON 字段,读写高效

## 安全考虑

- API Keys 存储在 `model_providers` 表,不暴露给前端
- ClaudeService 添加配置验证,确保必要字段存在
- 引擎切换不影响现有权限控制
- 两个引擎完全隔离,避免相互干扰

## 测试策略

- **单元测试**:
  - ClaudeService 的配置获取和验证
  - Provider 对象构建逻辑
  - API 路由选择逻辑
- **集成测试**:
  - reportService 使用 claudeService
  - /api/chat/claude 端到端测试
  - 引擎切换完整流程
- **端到端测试**:
  - 用户在 UI 中切换引擎
  - 验证不同引擎的响应
  - 会话配置持久化验证