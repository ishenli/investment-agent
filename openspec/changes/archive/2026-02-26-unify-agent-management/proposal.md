# Change: Unify Agent Management System

## Why

当前存在两套独立的 Agent 管理系统，导致配置分散、维护困难：

1. **硬编码内置 Agent**：通过 `SESSION_CONFIG_MAP` 在代码中硬编码，支持系统初始化时创建会话，但无法在 UI 中配置
2. **数据库 Agent 表**：通过 Agent 配置页面管理，但与 Session 创建流程脱节，用户创建的 Agent 无法直接用于会话

这种分离导致：
- 用户无法在 UI 中修改内置 Agent 的配置（如 systemRole、openingQuestions）
- 用户自定义 Agent 无法创建会话，两套系统无法互通
- 配置维护需要在代码和数据库两端分别处理

## What Changes

### 核心变更

1. **保留 `inbox` 作为系统基础 Agent**：`INBOX_SESSION_CONFIG` 保留硬编码，作为系统通用的默认 Agent
2. **数据库管理其他 Agent**：`market_information` 等其他 Agent 移至数据库 `agent` 表管理
3. **内置 Agent 标识**：给 `agent` 表添加 `isBuiltin` 字段，标记系统内置 Agent（如 `market_information`）
4. **自动初始化**：系统首次启动时，自动将非 inbox 的内置 Agent 配置写入数据库
5. **统一配置入口**：Agent 配置页面支持管理数据库中的 Agent（内置 + 用户自定义）
6. **Session-Agent 关联**：`chatSessions.agentId` 关联到 `agent.slug`，支持用户选择任意 Agent 创建会话

### Agent 分类

| 类型 | 存储位置 | 初始化方式 | UI 配置 |
|------|---------|-----------|---------|
| `inbox` (系统基础) | 硬编码 | 系统启动时初始化 | ❌ 不可配置 |
| 内置 Agent (market_information 等) | 数据库 `agent` 表 | 自动初始化 | ✅ 部分可配置 |
| 用户自定义 Agent | 数据库 `agent` 表 | 用户手动创建 | ✅ 完全可配置 |

### **BREAKING** 变更

- `SESSION_CONFIG_MAP` 将精简为只包含 `inbox` 配置
- `initSessionConfig` 函数将被重构，分离 inbox 初始化和数据库 Agent 初始化

## Impact

- Affected specs: `agent-management` (新建)
- Affected code:
  - `src/instrumentation.ts` - 新增，服务端启动钩子
  - `src/server/const/builtinAgents.ts` - 新增，内置 Agent 配置
  - `src/server/repository/agentRepository.ts` - 新增，Agent 数据访问层
  - `src/server/service/agentService.ts` - 新增，Agent 业务逻辑层
  - `drizzle/schema.ts` - 添加 `isBuiltin` 字段
  - `src/app/const/session.ts` - 精简 `SESSION_CONFIG_MAP`，只保留 `inbox`
  - `src/app/services/session/serverClient.ts` - 重构 `initSessionConfig`
  - `src/app/(pages)/setting/agent/page.tsx` - 支持数据库 Agent 管理
  - `src/app/api/agent/route.ts` - 支持 Agent 查询和更新
  - `next.config.js` - 启用 `instrumentationHook`

## Design Overview

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    src/instrumentation.ts                    │
│              (Next.js 服务端启动入口)                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              src/server/service/agentService.ts              │
│                    (业务逻辑层)                               │
│  - initializeBuiltinAgents()                                │
│  - getAgentBySlug()                                         │
│  - listAgents()                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              src/server/repository/agentRepository.ts        │
│                    (数据访问层)                               │
│  - findBySlug()                                             │
│  - findByIsBuiltin()                                        │
│  - create()                                                 │
│  - existsBySlugAndIsBuiltin()                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    drizzle/schema.ts                         │
│                      (数据表)                                 │
│  agent: id, slug, name, ..., isBuiltin                      │
└─────────────────────────────────────────────────────────────┘
```

### 数据模型变更

```typescript
// agent 表新增字段
agent = sqliteTable('agent', {
  // ... existing fields
  isBuiltin: integer('is_builtin', { mode: 'boolean' }).notNull().default(false),
});

// chatSessions.agentId 改为外键引用 agent.slug
// 特殊值 'inbox' 表示使用硬编码的系统基础 Agent
chatSessions = sqliteTable('chat_sessions', {
  // ...
  agentId: text('agent_id'), // 'inbox' 或 agent.slug
});
```

### 初始化流程

```
Next.js 服务启动
       ↓
instrumentation.register() 执行
       ↓
AgentService.initializeBuiltinAgents()
       ↓
┌─────────────────────────────────────────┐
│ 遍历 BUILTIN_AGENTS_CONFIG              │
│ - 检查 agent 表中是否已存在              │
│ - 缺失则从配置创建，isBuiltin=true       │
│ - apiKey/apiUrl 从系统默认设置获取        │
└─────────────────────────────────────────┘
       ↓
服务就绪，客户端请求可直接访问
```

### Agent 分类逻辑

```typescript
// 硬编码的系统基础 Agent
const INBOX_AGENT_SLUG = 'inbox';

// 判断是否为系统基础 Agent
function isSystemAgent(slug: string): boolean {
  return slug === INBOX_AGENT_SLUG;
}

// 判断是否为数据库内置 Agent
function isBuiltinAgent(agent: Agent): boolean {
  return agent.isBuiltin === true;
}
```

### 关键代码文件

**1. instrumentation.ts** - 服务端启动钩子
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { AgentService } = await import('@server/service/agentService');
    const agentService = new AgentService();
    await agentService.initializeBuiltinAgents();
  }
}
```

**2. builtinAgents.ts** - 内置 Agent 配置
```typescript
export const BUILTIN_AGENTS_CONFIG = [
  {
    slug: 'market_information',
    name: 'Market Information Analyzer',
    description: 'Market Information Related Queries',
    systemRole: '...',
    openingQuestions: ['...'],
    logo: '...',
  },
] as const;
```

**3. agentRepository.ts** - 继承 BaseIntRepository
```typescript
export class AgentRepository extends BaseIntRepository<AgentEntity> {
  async findBySlug(slug: string) { ... }
  async findByIsBuiltin(isBuiltin: boolean) { ... }
  async existsBySlugAndIsBuiltin(slug: string, isBuiltin: boolean) { ... }
}
```

**4. agentService.ts** - 业务逻辑层
```typescript
export class AgentService {
  async initializeBuiltinAgents(): Promise<void> { ... }
  async getAgentBySlug(slug: string) { ... }
  async listAgents(options?: { isBuiltin?: boolean }) { ... }
}
```