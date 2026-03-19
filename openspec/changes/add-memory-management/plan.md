# 实现计划：Memory Management

**分支**：`add-memory-management` | **日期**：2026-03-17 | **规范**：memory-management
**输入**：proposal.md + openclaw-memory-design.md

## 概要

基于 OpenClaw **"文件优先（File-First）"** 设计哲学，为投资助手构建双层记忆系统。
短期记忆使用 Markdown 文件存储（人类可读，便于调试），长期记忆使用 SQLite 持久化（支持混合搜索），并通过 Vector + BM25 实现高质量的记忆检索。

### 记忆分层架构

```
┌──────────────────────────────────────────────────────┐
│              Identity Layer（身份层）                  │
│  agent_profiles 表 (soul / user_context / investment_style)  │
│  → 每次会话必定加载，定义 Agent 的投资分析师人格          │
├──────────────────────────────────────────────────────┤
│              Long-term Memory（长期记忆）              │
│  agent_memories 表（SQLite，带 category / importance） │
│  → 跨会话持久化的关键事实、投资决策、用户偏好             │
│  → 支持 Vector + BM25 混合搜索                         │
├──────────────────────────────────────────────────────┤
│              Short-term Memory（短期记忆）             │
│  Markdown 文件（memory/users/{userId}/*.md）          │
│  → 人类可读，便于调试，3 天自动清理                      │
│  → 符合 OpenClaw 文件优先设计哲学                       │
└──────────────────────────────────────────────────────┘
```

### 渐进式记忆提取

记忆提取是渐进式的——随着对话积累，助理越来越了解用户：

```
第1-2次对话  →  基础偏好轮廓初始化
第3-10次对话 →  偏好细化，捕捉持仓逻辑
第10+次对话  →  深层策略提炼，个性化建议质量显著提升
```

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, LangGraph, Drizzle ORM
**存储**：SQLite（长期记忆 + 身份配置）+ Markdown 文件（短期记忆）
**测试**：Vitest
**目标平台**：桌面 Web（Electron + Web）
**性能目标**：记忆检索 < 100ms，记忆注入不增加对话延迟
**约束条件**：必须兼容现有 LangGraph Agent 集成，支持多用户隔离

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-memory-management/
├── proposal.md
├── plan.md                  # 此文件
├── tasks.md
└── specs/memory/spec.md
```

### 源代码

```text
drizzle/schema/
└── memory.ts                # 两张新表定义（agent_memories, agent_profiles）

src/server/core/memory/
├── index.ts                 # 统一导出
├── memory-manager.ts        # 核心调度器（Bootstrap + ExtractAndStore + Search）
├── memory-search.ts         # Vector + BM25 混合搜索引擎（仅长期记忆）
├── memory-flush.ts          # 上下文压缩前的记忆冲刷
├── memory-extractor.ts      # 从对话中自动提取记忆（LLM Prompt）
├── embedding-provider.ts    # Embedding 生成（复用现有 MODEL_PROVIDER_URL）
└── short-term-memory.ts     # 短期记忆 Markdown 文件服务

src/server/
├── repository/
│   └── memoryRepository.ts  # 两张表的 CRUD（继承 BaseIntRepository）
└── service/
    └── memoryService.ts     # 业务逻辑（供 API + SDK Hooks 调用）

src/server/core/claude/
└── memoryHooks.ts           # SDK Hooks：会话启动注入记忆 + 对话结束提取记忆

src/app/
├── api/memory/route.ts      # REST API（CRUD + profile 管理）
├── store/memory/            # Zustand 状态管理
└── (pages)/settings/memory/ # 记忆管理 UI 页面

# 短期记忆存储位置（运行时）
{getProjectRoot()}/memory/users/{userId}/*.md
```

## 需求拆分

### User Stories（按优先级）

| 优先级 | 用户故事 | 验收条件 |
|--------|---------|---------|
| P1 | 作为用户，AI 在对话中自动渐进式提取我的投资偏好并记忆 | 对话后 agent_memories 出现新条目，下次对话 AI 引用 |
| P2 | 作为用户，我可以手动添加、编辑、删除长期记忆 | 设置页面完整 CRUD，操作立即反映在下次对话中 |
| P3 | 作为用户，高价值短期记忆自动晋升为长期记忆 | 重要性 >= 7 的记忆自动写入 agent_memories |
| P4 | 作为用户，系统在上下文即将溢出时自动保存关键记忆 | token 接近阈值触发 flush，重要内容不丢失 |

## 技术架构

### 数据库 Schema（两张新表）

```typescript
// drizzle/schema/memory.ts

// 1. 长期记忆（对应 OpenClaw MEMORY.md）
agent_memories: {
  userId, category, content, source, importance(1-10),
  accessCount, lastAccessedAt, embedding(JSON), createdAt, updatedAt, deletedAt
}

// 2. Agent 身份配置（对应 OpenClaw SOUL.md / USER.md）
agent_profiles: {
  userId, profileType(soul|user_context|investment_style),
  content(markdown), createdAt, updatedAt
}
```

### 短期记忆文件格式

存储位置：`{getProjectRoot()}/memory/users/{userId}/{category}.md`

```markdown
---
category: investment_preference
source: agent_extracted
importance: 8
created_at: 2026-03-18T10:00:00Z
updated_at: 2026-03-18T10:00:00Z
---

用户偏好价值投资，不喜欢追涨杀跌。
主要关注科技股，特别是 AI 板块。
```

记忆分类（`agent_memories.category`）：

```typescript
type MemoryCategory =
  | 'investment_preference'  // 投资偏好（含风险承受能力）
  | 'trading_strategy'       // 交易策略（止损、止盈、加仓条件）
  | 'position_rule'          // 仓位规则（单一持仓上限、分散投资）
  | 'market_view'            // 市场观点
  | 'investment_decision'    // 投资决策（具体买卖决策及理由）
  | 'personal_info';         // 个人背景（投资经验、主要市场）
```

### 核心模块设计

#### ShortTermMemory（短期记忆文件服务）

```typescript
// 管理短期记忆 Markdown 文件
class ShortTermMemory {
  // 写入/更新短期记忆文件
  async writeMemory(userId: number, category: MemoryCategory, content: string, importance: number): Promise<void>

  // 读取用户所有短期记忆
  async readMemories(userId: number): Promise<ShortTermMemoryItem[]>

  // 清理过期记忆（3 天前）
  async cleanupExpired(userId: number): Promise<number>

  // 删除指定分类的记忆
  async deleteMemory(userId: number, category: MemoryCategory): Promise<void>
}
```

#### MemoryManager（核心调度）

```typescript
class MemoryManager {
  // 会话启动：按 OpenClaw Bootstrap 流程加载
  async loadSessionContext(userId: number): Promise<SessionContext>
  // {soul, userCtx, investStyle, shortTermMemories(3天内), coreMemories(importance>=7)}

  // 对话结束后：渐进式提取并存储
  async extractAndStore(userId: number, messages: Message[]): Promise<void>
  // → MemoryExtractor.extract() → writeShortTermMemory() + upsertLongTermMemory(importance>=7)

  // 语义搜索（供 SDK Hooks 调用，仅搜索长期记忆）
  async search(userId: number, query: string, limit = 6): Promise<MemorySearchResult[]>

  // 上下文压缩前冲刷
  async flushBeforeCompaction(userId: number, context: ConversationContext): Promise<void>
}
```

#### MemorySearch（混合搜索引擎）

```typescript
// Vector(70%) + BM25(30%) + Reciprocal Rank Fusion
// 仅搜索长期记忆（agent_memories 表）
// 无向量时自动降级为纯关键词搜索
class MemorySearch {
  async hybridSearch(userId, query, limit): Promise<MemorySearchResult[]>
}
```

#### MemoryExtractor（渐进式自动提取）

```typescript
// 使用投资场景定制的 LLM Prompt
// 提取：投资偏好、持仓策略、关注标的、个人背景、近期关注点
// 用户累计 >= 3 条消息后启动，每次增量更新
class MemoryExtractor {
  async extract(messages: Message[]): Promise<ExtractedMemory[]>
}
```

#### MemoryFlusher（上下文压缩前冲刷）

```typescript
// 监测 token 接近阈值（contextWindow - 20000 - 4000）
// 触发：LLM 提炼当前上下文 → 写入短期记忆 → importance>=7 晋升长期记忆
class MemoryFlusher {
  shouldFlush(currentTokens, contextWindow): boolean
  async flush(userId, context): Promise<void>
}
```

### Claude Agent SDK Hooks 集成

在现有 `claudeClient.ts` 的 `streamClaude()` 中接入记忆系统：

```typescript
// 集成点1：会话启动时，在 systemPrompt 中注入记忆上下文
const sessionMemory = await memoryManager.loadSessionContext(userId);
const memoryPrompt = memoryManager.buildMemoryPrompt(sessionMemory);
queryOptions.systemPrompt = `${baseSystemPrompt}\n\n${memoryPrompt}`;

// 集成点2：每轮 AI 回复结束后，渐进式提取并存储记忆
queryOptions.hooks = {
  ...existingHooks,
  PostModelTurn: [{
    hooks: [async () => {
      // 异步执行，不阻塞响应
      memoryManager.extractAndStore(userId, messages).catch(logger.error);
      return {};
    }],
  }],
};
```

### 记忆注入 System Prompt 格式

```markdown
## 关于你的用户

### 投资风格画像
{agent_profiles.investment_style 内容}

### 长期记忆（核心偏好）
- [investment_preference] 偏好科技股投资
- [position_rule] 单一持仓不超过 20%

### 近期会话记忆（最近3天）
{短期记忆 Markdown 文件内容}
```

### 数据流

```
[对话开始 → streamClaude() 调用]
    ↓
memoryManager.loadSessionContext()
    ├── 读取 agent_profiles（SQLite）
    ├── 读取 agent_memories（SQLite，importance>=7）
    └── 读取短期记忆文件（Markdown，3天内）
    ↓
buildMemoryPrompt() → 注入 queryOptions.systemPrompt
    ↓
[对话中] → token 接近阈值 → PostModelTurn Hook → MemoryFlusher.flush()（可选）
    ↓
[每轮 AI 回复结束]
    ↓
PostModelTurn Hook → memoryManager.extractAndStore()（异步）
    ├── 写入短期记忆文件（Markdown）
    └── importance>=7 → 晋升长期记忆（SQLite）
```

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Embedding 生成延迟 | 中 | 异步后台执行，不阻塞对话响应 |
| 记忆过多撑爆 context | 中 | 按 importance 排序，最多注入 10 条；近2天日志截断 |
| 自动提取不准确 | 低 | 用户可在设置页面编辑/删除；重要性 < 5 不晋升长期 |
| 多用户隔离 | 高 | 所有查询强制 WHERE user_id = ? |
| 无向量支持环境 | 低 | MemorySearch 自动降级为纯 BM25 关键词搜索 |

## 性能考虑

- 长期记忆检索 < 100ms（SQLite 索引 + 限制返回数量）
- 短期记忆读取 < 50ms（文件系统直接读取）
- Embedding 生成异步执行，复用现有 MODEL_PROVIDER_URL
- 短期记忆写入：追加模式，O(1)
- 记忆注入：最多 10 条长期记忆 + 最近 3 天短期记忆

## 安全考虑

- 用户数据隔离：所有操作强制验证 userId
- 软删除：`deletedAt` 字段，保留审计记录
- 不存储 API Key、密码等敏感信息

## 测试策略

- **单元测试**：MemoryExtractor、MemorySearch、MemoryFlusher 各自独立测试
- **集成测试**：MemoryManager 端到端流程、API 端点
- **E2E 验证**：SDK Hook 触发后对话中记忆注入效果
