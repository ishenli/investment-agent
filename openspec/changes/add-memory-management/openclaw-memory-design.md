# OpenClaw 龙虾记忆系统设计文档

> 参考 OpenClaw（原 Clawdbot/Moltbot）的记忆架构，设计适用于 Investment Agent 的持久化记忆系统。

## 1. OpenClaw 记忆架构概述

### 1.1 核心设计哲学

OpenClaw 的记忆系统遵循 **"文件优先（File-First）"** 原则：

- **Markdown 文件是唯一的事实来源（Source of Truth）**，而非向量数据库
- 所有记忆以纯文本存储，可被人类直接阅读、编辑和 Git 版本控制
- 向量数据库仅作为检索索引层，辅助语义搜索

### 1.2 认知铁三角：三大核心文件

OpenClaw 通过三个 Markdown 文件构建 Agent 的持久认知：

```
workspace/
├── SOUL.md          # 灵魂 — Agent 的行为哲学、性格、价值观
├── USER.md          # 用户画像 — 用户的身份、偏好、工作上下文
├── IDENTITY.md      # 身份 — Agent 的名字、角色定位、能力边界
├── MEMORY.md        # 长期记忆 — 跨会话持久化的重要事实
├── AGENTS.md        # 操作规程 — 每次会话的启动流程、行为规则
└── memory/
    ├── 2026-03-13.md  # 每日工作日志（短期记忆）
    ├── 2026-03-12.md
    └── ...
```

每次会话启动时，Agent 按固定顺序加载这些文件：
1. 读取 `SOUL.md` — 确认自己是谁
2. 读取 `USER.md` — 确认服务对象
3. 读取当天和前一天的 `memory/YYYY-MM-DD.md` — 获取最近上下文
4. 读取 `MEMORY.md` — 获取长期记忆

### 1.3 记忆分层架构

```
┌─────────────────────────────────────────────┐
│           Identity Layer（身份层）            │
│  SOUL.md / USER.md / IDENTITY.md            │
│  → 每次会话必定加载，定义 Agent 的基本认知      │
├─────────────────────────────────────────────┤
│           Long-term Memory（长期记忆）        │
│  MEMORY.md                                  │
│  → 跨会话持久化的关键事实、决策、用户偏好       │
├─────────────────────────────────────────────┤
│           Short-term Memory（短期记忆）       │
│  memory/YYYY-MM-DD.md                       │
│  → 每日工作日志，append-only 追加写入          │
├─────────────────────────────────────────────┤
│           Search Index（检索索引层）          │
│  SQLite + Vector Embeddings + BM25          │
│  → 混合搜索引擎，支持语义查询和关键词精确匹配    │
└─────────────────────────────────────────────┘
```

### 1.4 混合搜索机制

OpenClaw 使用 **Vector + BM25** 双引擎混合搜索：

- **向量搜索（70% 权重）**：擅长语义匹配，如 "基础设施网关主机" 能匹配 "运行网关的那台机器"
- **BM25 关键词搜索（30% 权重）**：擅长精确 token 匹配，如股票代码、错误信息、环境变量名
- 如果向量搜索不可用，自动降级为纯关键词搜索

### 1.5 上下文压缩前的记忆冲刷（Memory Flush）

当会话接近上下文窗口上限时，OpenClaw 会在压缩前触发一次**静默的记忆冲刷**：

1. 检测 token 用量接近阈值（`contextWindow - reserveTokensFloor - softThresholdTokens`）
2. 向 Agent 插入一条隐藏的 system prompt："会话即将压缩，请立即将重要记忆写入 memory/ 文件"
3. Agent 将关键上下文持久化到磁盘
4. 随后执行上下文压缩，旧消息被摘要替代

这确保了**压缩是一个检查点操作而非破坏性操作**。

### 1.6 存储实现

```
~/.openclaw/memory/{agentId}.sqlite
```

SQLite 数据库包含核心表：
- **files**：跟踪文件的 mtime、size、content hash，跳过未变更文件的重索引
- **chunks**：存储文本片段、行范围和 JSON 序列化的 embedding 向量
- 使用 file watcher 监控 memory 文件变化（1.5s 防抖），自动触发重新索引

---

## 2. Investment Agent 记忆系统设计

基于 OpenClaw 的架构，结合本项目的技术栈（Next.js + LangGraph + SQLite/Drizzle ORM），设计以下记忆系统。

### 2.1 数据库 Schema 设计

新增三张表，集成到现有的 Drizzle schema 中：

```typescript
// drizzle/schema/memory.ts

import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { users } from '../schema';

// ========== 1. 长期记忆表 ==========
// 存储跨会话的持久化记忆条目（对应 OpenClaw 的 MEMORY.md）
export const agentMemories = sqliteTable('agent_memories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  // 记忆类别
  category: text('category', {
    enum: ['user_preference', 'investment_decision', 'market_insight', 'portfolio_rule', 'general'],
  }).notNull().default('general'),
  // 记忆内容（纯文本/Markdown）
  content: text('content').notNull(),
  // 来源：用户明确告知 / Agent 自动提取 / 系统生成
  source: text('source', {
    enum: ['user_explicit', 'agent_extracted', 'system'],
  }).notNull().default('agent_extracted'),
  // 重要性评分（1-10），用于在 context 溢出时的优先级排序
  importance: integer('importance').notNull().default(5),
  // 访问计数，用于衰减/淘汰不再使用的记忆
  accessCount: integer('access_count').notNull().default(0),
  lastAccessedAt: integer('last_accessed_at', { mode: 'timestamp' }),
  // embedding 向量（JSON 序列化的 float 数组）
  embedding: text('embedding', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => [
  index('idx_agent_memories_user_category').on(table.userId, table.category),
  index('idx_agent_memories_importance').on(table.importance),
  index('idx_agent_memories_deleted_at').on(table.deletedAt),
]);

// ========== 2. 每日会话日志表 ==========
// 存储每日交互日志（对应 OpenClaw 的 memory/YYYY-MM-DD.md）
export const agentDailyLogs = sqliteTable('agent_daily_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  // 日期键 (YYYY-MM-DD 格式字符串)
  dateKey: text('date_key').notNull(),
  // Markdown 格式的日志内容（append-only 追加）
  content: text('content').notNull().default(''),
  // 当日摘要（由 Agent 在会话结束或压缩前生成）
  summary: text('summary'),
  // embedding 向量
  embedding: text('embedding', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_agent_daily_logs_user_date').on(table.userId, table.dateKey),
]);

// ========== 3. Agent 身份配置表 ==========
// 存储 Agent 的身份和用户画像（对应 SOUL.md / USER.md）
export const agentProfiles = sqliteTable('agent_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  // 配置类型
  profileType: text('profile_type', {
    enum: ['soul', 'user_context', 'investment_style'],
  }).notNull(),
  // Markdown 格式的配置内容
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_agent_profiles_user_type').on(table.userId, table.profileType),
]);
```

### 2.2 核心模块设计

```
src/server/core/memory/
├── index.ts                    # 统一导出
├── memory-manager.ts           # 记忆管理器（核心调度）
├── memory-search.ts            # 混合搜索引擎
├── memory-flush.ts             # 上下文压缩前的记忆冲刷
├── memory-extractor.ts         # 从对话中自动提取记忆
├── embedding-provider.ts       # Embedding 生成（支持多 Provider）
└── daily-log-writer.ts         # 每日日志写入器
```

### 2.3 MemoryManager 核心流程

```typescript
// src/server/core/memory/memory-manager.ts

export class MemoryManager {
  /**
   * 会话启动时加载上下文（对应 OpenClaw 的 Bootstrap 流程）
   * 按优先级从高到低加载：
   * 1. Agent Soul（投资分析师身份定义）
   * 2. User Context（用户投资偏好画像）
   * 3. 最近 2 天的日志
   * 4. 长期记忆中 importance >= 7 的条目
   */
  async loadSessionContext(userId: number): Promise<SessionContext> {
    const [soul, userCtx, investStyle] = await Promise.all([
      this.getProfile(userId, 'soul'),
      this.getProfile(userId, 'user_context'),
      this.getProfile(userId, 'investment_style'),
    ]);

    const recentLogs = await this.getRecentDailyLogs(userId, 2);
    const coreMemories = await this.getMemoriesByImportance(userId, 7);

    return { soul, userCtx, investStyle, recentLogs, coreMemories };
  }

  /**
   * 在 Agent 回复后提取并存储记忆
   * 从对话内容中识别：
   * - 用户明确表达的偏好（如 "我偏好价值投资"）
   * - 投资决策（如 "决定卖出 TSLA"）
   * - 市场洞察（如 "科技股近期承压"）
   */
  async extractAndStore(userId: number, messages: Message[]): Promise<void> {
    const extracted = await this.extractor.extract(messages);
    for (const memory of extracted) {
      await this.upsertMemory(userId, memory);
    }
    await this.appendDailyLog(userId, messages);
  }

  /**
   * 语义搜索记忆（Vector + BM25 混合）
   */
  async search(userId: number, query: string, limit = 6): Promise<MemorySearchResult[]> {
    return this.searchEngine.hybridSearch(userId, query, limit);
  }

  /**
   * 上下文压缩前的记忆冲刷
   * 当 token 使用量接近阈值时触发
   */
  async flushBeforeCompaction(userId: number, context: ConversationContext): Promise<void> {
    await this.flusher.flush(userId, context);
  }
}
```

### 2.4 混合搜索实现

```typescript
// src/server/core/memory/memory-search.ts

export class MemorySearch {
  private readonly VECTOR_WEIGHT = 0.7;
  private readonly BM25_WEIGHT = 0.3;

  async hybridSearch(
    userId: number,
    query: string,
    limit: number
  ): Promise<MemorySearchResult[]> {
    // 1. 生成查询向量
    const queryEmbedding = await this.embeddingProvider.embed(query);

    // 2. 向量相似度搜索
    const vectorResults = await this.vectorSearch(userId, queryEmbedding, limit * 2);

    // 3. BM25 关键词搜索
    const bm25Results = await this.bm25Search(userId, query, limit * 2);

    // 4. 融合排序 (Reciprocal Rank Fusion)
    const merged = this.reciprocalRankFusion(vectorResults, bm25Results);

    // 5. 更新访问计数
    await this.updateAccessCounts(merged.slice(0, limit));

    return merged.slice(0, limit);
  }

  private reciprocalRankFusion(
    vectorResults: ScoredMemory[],
    bm25Results: ScoredMemory[]
  ): MemorySearchResult[] {
    const k = 60; // RRF 常数
    const scores = new Map<number, number>();

    vectorResults.forEach((r, i) => {
      const current = scores.get(r.id) ?? 0;
      scores.set(r.id, current + this.VECTOR_WEIGHT / (k + i + 1));
    });

    bm25Results.forEach((r, i) => {
      const current = scores.get(r.id) ?? 0;
      scores.set(r.id, current + this.BM25_WEIGHT / (k + i + 1));
    });

    return [...scores.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([id, score]) => ({ id, score }));
  }
}
```

### 2.5 记忆自动提取

```typescript
// src/server/core/memory/memory-extractor.ts

const EXTRACTION_PROMPT = `
你是投资助手的记忆管理模块。分析以下对话，提取值得长期记忆的信息。

提取规则：
1. 用户明确表达的投资偏好（如风险偏好、持仓策略、行业偏好）
2. 重要的投资决策及其理由
3. 用户反复提及的关注点
4. 需要跨会话记住的具体事实（如目标价、止损位）

不要提取：
- 临时性的市场报价
- 一次性的闲聊内容
- 已过时的信息

输出 JSON 数组，每条记忆包含：
- category: user_preference | investment_decision | market_insight | portfolio_rule
- content: 记忆内容（简明扼要）
- importance: 1-10 重要性评分
`;

export class MemoryExtractor {
  async extract(messages: Message[]): Promise<ExtractedMemory[]> {
    const response = await this.llm.invoke([
      { role: 'system', content: EXTRACTION_PROMPT },
      { role: 'user', content: this.formatMessages(messages) },
    ]);
    return JSON.parse(response.content);
  }
}
```

### 2.6 上下文压缩前冲刷

```typescript
// src/server/core/memory/memory-flush.ts

export class MemoryFlusher {
  private readonly SOFT_THRESHOLD_TOKENS = 4000;
  private readonly RESERVE_FLOOR_TOKENS = 20000;

  /**
   * 检查是否需要触发 flush
   */
  shouldFlush(currentTokens: number, contextWindow: number): boolean {
    return currentTokens >= contextWindow - this.RESERVE_FLOOR_TOKENS - this.SOFT_THRESHOLD_TOKENS;
  }

  /**
   * 执行 flush：提取当前会话的关键信息，写入日志和长期记忆
   */
  async flush(userId: number, context: ConversationContext): Promise<void> {
    // 1. 让 LLM 从当前上下文中提炼持久化信息
    const durableNotes = await this.extractDurableNotes(context);

    // 2. 追加到当日日志
    await this.dailyLogWriter.append(userId, durableNotes.dailySummary);

    // 3. 高重要性内容升级到长期记忆
    for (const memory of durableNotes.longTermMemories) {
      if (memory.importance >= 7) {
        await this.memoryManager.upsertMemory(userId, memory);
      }
    }
  }
}
```

### 2.7 与 LangGraph Agent 集成

在现有的 LangGraph 投资分析 Agent 中接入记忆系统：

```typescript
// src/server/core/deepagents/investmentAdvisorAgent/agent.ts

import { MemoryManager } from '../../memory';

// 在 Agent state 中增加记忆字段
interface InvestmentAgentState {
  // ... 现有字段
  sessionMemory: SessionContext;
}

// 在 Agent 图的入口节点加载记忆
async function loadMemoryNode(state: InvestmentAgentState) {
  const memoryManager = new MemoryManager();
  const sessionMemory = await memoryManager.loadSessionContext(state.userId);

  // 将记忆注入 system prompt
  const memoryPrompt = buildMemoryPrompt(sessionMemory);

  return {
    ...state,
    sessionMemory,
    systemPromptSuffix: memoryPrompt,
  };
}

// 在 Agent 图的出口节点提取并保存记忆
async function saveMemoryNode(state: InvestmentAgentState) {
  const memoryManager = new MemoryManager();
  await memoryManager.extractAndStore(state.userId, state.messages);
  return state;
}
```

### 2.8 投资场景特化的 Agent Profile

```markdown
<!-- agent_profiles: soul -->
# Investment Agent Soul

## 核心身份
你是一个专业的投资分析助手。你的记忆跨越多个会话——你记得用户的投资风格、
持仓历史和过去的分析结论。

## 行为准则
- 基于记忆中的用户风险偏好提供个性化建议
- 引用过去的分析结论时，注明时间上下文（"上周我们分析时..."）
- 主动提醒用户之前设定的止盈止损价位
- 如果记忆中的信息可能已过时，主动声明并建议重新验证

## 记忆管理
- 重要的投资决策和理由必须记入长期记忆
- 用户表达的风险偏好变化需立即更新 user_context
- 每次会话结束前，整理当日关键发现写入日志
```

---

## 3. 与 OpenClaw 的对比

| 维度 | OpenClaw | Investment Agent |
|------|----------|------------------|
| 存储介质 | 文件系统 Markdown + SQLite 索引 | SQLite (Drizzle ORM) 直接存储 |
| 搜索方式 | Vector + BM25 混合搜索 | 同样采用混合搜索 |
| 身份系统 | SOUL.md / USER.md / IDENTITY.md | agent_profiles 表 (soul / user_context / investment_style) |
| 短期记忆 | memory/YYYY-MM-DD.md 文件 | agent_daily_logs 表 |
| 长期记忆 | MEMORY.md 文件 | agent_memories 表（带 category/importance） |
| 记忆冲刷 | 上下文压缩前静默 flush | 同样实现 flush before compaction |
| 记忆提取 | 会话后 LLM 自动提取 | 同样使用 LLM 提取，但针对投资场景定制 prompt |
| 特化能力 | 通用个人助手 | 投资偏好/决策/市场洞察分类记忆 |

## 4. 实施路径

### Phase 1：基础记忆存储
- 新增 `drizzle/schema/memory.ts`，添加三张新表
- 执行 migration
- 实现 `MemoryManager` 的 CRUD 操作

### Phase 2：会话集成
- 在 LangGraph Agent 入口加载记忆上下文
- 在 Agent 出口提取并保存记忆
- 实现每日日志的 append 逻辑

### Phase 3：智能搜索
- 集成 Embedding Provider（可复用现有 MODEL_PROVIDER_URL）
- 实现 Vector + BM25 混合搜索
- 实现记忆冲刷机制

### Phase 4：记忆治理
- 实现记忆衰减（长期未访问的记忆自动降低 importance）
- 实现语义去重（合并语义相近的记忆条目）
- 添加记忆管理 UI（查看/编辑/删除记忆）

---

## 参考资料

- [OpenClaw Memory 官方文档](https://docs.openclaw.ai/concepts/memory)
- [Deep Dive: How OpenClaw's Memory System Works](https://snowan.gitbook.io/study-notes/ai-blogs/openclaw-memory-system-deep-dive)
- [Local-First RAG: Using SQLite for AI Agent Memory](https://www.pingcap.com/blog/local-first-rag-using-sqlite-ai-agent-memory-openclaw/)
- [How OpenClaw Implements Agent Memory: A Code Walkthrough](https://www.mmntm.net/articles/openclaw-memory-architecture)
- [OpenClaw Memory Files Explained](https://openclaw-setup.me/blog/openclaw-memory-files/)
- [memsearch — 从 OpenClaw 提取的开源记忆库](https://milvus.io/blog/we-extracted-openclaws-memory-system-and-opensourced-it-memsearch.md)
