# 任务：Memory Management

**输入**：plan.md（必读） + openclaw-memory-design.md（参考）
**前置条件**：plan.md 已确认
**参考**：项目规范 `.claude/rules/`

**测试**：
- 类型检查：`npm run types:check`
- 单元测试：`npm test`

**组织方式**：任务按阶段分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可与同阶段其他 [P] 任务并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1-P4）

## 路径约定

| 类型 | 路径 |
|------|------|
| DB Schema | `drizzle/schema/memory.ts` |
| Core Memory | `src/server/core/memory/` |
| LangGraph Nodes | `src/server/core/deepagents/investmentAdvisorAgent/nodes/` |
| Repository | `src/server/repository/memoryRepository.ts` |
| Service | `src/server/service/memoryService.ts` |
| API Routes | `src/app/api/memory/route.ts` |
| Store | `src/app/store/memory/` |
| UI | `src/app/(pages)/settings/memory/` |
| Types | `src/types/memory.ts` |

---

## 第0阶段：准备

- [ ] T00 确认 proposal.md、plan.md、spec.md 内容一致，无遗漏变更点 <!-- id: 0 -->
- [ ] T01 运行 `openspec validate add-memory-management --strict` 验证规范 <!-- id: 1 -->

---

## 第1阶段：数据库 Schema（两张新表）

**目的**：建立数据库表结构，是所有后续工作的基础

- [ ] T10 [P] 新建 `drizzle/schema/memory.ts`，定义两张表 <!-- id: 10 -->
  - `agent_memories`：长期记忆（userId, category, content, source, importance, accessCount, lastAccessedAt, embedding, createdAt, updatedAt, deletedAt）
  - `agent_profiles`：身份配置（userId, profileType, content, createdAt, updatedAt）
  - 添加索引：`idx_agent_memories_user_category`、`idx_agent_memories_importance`、`idx_agent_profiles_user_type`（unique）

- [ ] T11 [P] 在 `drizzle/schema.ts` 中导入并 re-export `drizzle/schema/memory.ts` <!-- id: 11 -->

- [ ] T12 执行 `npm run db:generate` 生成 migration 文件 <!-- id: 12 -->

- [ ] T13 执行 `npm run db:migrate` 应用 migration <!-- id: 13 -->

- [ ] T14 [P] 在 `src/types/memory.ts` 定义 TypeScript 类型 <!-- id: 14 -->
  ```typescript
  type MemoryCategory = 'investment_preference' | 'trading_strategy' | 'position_rule' | 'market_view' | 'investment_decision' | 'personal_info'
  type MemorySource = 'manual' | 'agent_extracted' | 'system'
  type ProfileType = 'soul' | 'user_context' | 'investment_style'
  interface AgentMemory { ... }
  interface AgentProfile { ... }
  interface ShortTermMemoryItem { category, content, source, importance, createdAt, updatedAt }
  interface SessionContext { soul, userCtx, investStyle, shortTermMemories, coreMemories }
  interface ExtractedMemory { category, content, importance }
  interface MemorySearchResult { id, score, content, category }
  ```

**检查点**：`npm run types:check` 通过，migration 文件生成

---

## 第2阶段：核心 Memory 模块

**目的**：实现 `src/server/core/memory/` 下的全部模块

**⚠️ 关键**：此阶段完成前不应开始 LangGraph/API/UI 工作

### 2a. Repository 层

- [ ] T20 [P] 实现 `src/server/repository/memoryRepository.ts` <!-- id: 20 -->
  - 继承 `BaseIntRepository`
  - `agent_memories`：`findByUserId`、`findByUserIdAndCategory`、`upsert`（按 content 语义去重）、`softDelete`、`updateAccessCount`
  - `agent_profiles`：`findByUserIdAndType`、`upsertProfile`

### 2b. Embedding Provider

- [ ] T21 [P] 实现 `src/server/core/memory/embedding-provider.ts` <!-- id: 21 -->
  - 复用现有 `MODEL_PROVIDER_URL` 发起 embedding 请求
  - 返回 `number[]`，序列化为 JSON 存入 SQLite
  - 不可用时静默 fallback（返回 null）

### 2c. 混合搜索引擎

- [ ] T22 实现 `src/server/core/memory/memory-search.ts`（依赖 T21） <!-- id: 22 -->
  - Vector 搜索（70% 权重）：从 embedding JSON 计算余弦相似度
  - BM25 关键词搜索（30% 权重）：SQLite FTS5 或手动 TF-IDF
  - Reciprocal Rank Fusion 融合排序（k=60）
  - 无向量时自动降级为纯 BM25
  - 搜索后异步更新 `accessCount` 和 `lastAccessedAt`

### 2d. 短期记忆文件服务

- [ ] T23 [P] 实现 `src/server/core/memory/short-term-memory.ts` <!-- id: 23 -->
  - `writeMemory(userId, category, content, importance)`：写入 Markdown 文件到 `{getProjectRoot()}/memory/users/{userId}/{category}.md`
  - `readMemories(userId)`：读取用户所有短期记忆文件
  - `cleanupExpired(userId)`：清理 3 天前的文件
  - `deleteMemory(userId, category)`：删除指定分类的记忆文件
  - 文件格式：YAML frontmatter + markdown content

### 2e. 渐进式记忆提取器

- [ ] T24 [P] 实现 `src/server/core/memory/memory-extractor.ts` <!-- id: 24 -->
  - 投资场景定制 Prompt（提取投资偏好/持仓策略/关注标的/个人背景/近期关注点）
  - 触发条件：累计消息数 >= 3
  - 增量更新：输出 JSON 数组 `[{category, content, importance}]`
  - 不提取：临时报价、一次性闲聊、已过时信息

### 2f. 上下文压缩前冲刷

- [ ] T25 实现 `src/server/core/memory/memory-flush.ts`（依赖 T23） <!-- id: 25 -->
  - `shouldFlush(currentTokens, contextWindow)`：阈值 = contextWindow - 20000 - 4000
  - `flush(userId, context)`：
    1. LLM 提炼当前上下文的持久化摘要
    2. 写入短期记忆文件（short-term-memory）
    3. importance >= 7 的记忆自动晋升 agent_memories

### 2g. MemoryManager（核心调度）

- [ ] T26 实现 `src/server/core/memory/memory-manager.ts`（依赖 T20-T25） <!-- id: 26 -->
  - `loadSessionContext(userId)`：并行加载 soul + user_context + investment_style + 短期记忆 + importance>=7 记忆
  - `extractAndStore(userId, messages)`：调用 MemoryExtractor → writeShortTermMemory → upsertMemory(importance>=7) → 异步生成 embedding
  - `search(userId, query, limit=6)`：委托 MemorySearch.hybridSearch
  - `flushBeforeCompaction(userId, context)`：委托 MemoryFlusher.flush
  - `buildMemoryPrompt(ctx)`：生成注入 System Prompt 的记忆上下文文本

- [ ] T27 新建 `src/server/core/memory/index.ts` 统一导出 <!-- id: 27 -->

### 2h. 测试

- [ ] T28 编写核心模块单元测试 <!-- id: 28 -->
  - `MemoryExtractor.extract()` 输出格式验证
  - `MemorySearch` RRF 融合逻辑验证
  - `MemoryFlusher.shouldFlush()` 阈值验证
  - `ShortTermMemory` 文件读写验证
  - `MemoryManager.loadSessionContext()` 集成测试

**检查点**：`npm test` 全通，`npm run types:check` 通过

---

## 第3阶段：Claude Agent SDK Hooks 集成

**目的**：在 `claudeClient.ts` 的 `streamClaude()` 中接入记忆系统

- [ ] T30 实现 `src/server/core/claude/memoryHooks.ts`（依赖 T26） <!-- id: 30 -->
  - `createMemoryHooks(userId, memoryManager)`：返回 SDK hooks 配置对象
  - `PostModelTurn` hook：异步调用 `memoryManager.extractAndStore()`，不阻塞响应
  - token 阈值检测：接近上限时调用 `memoryManager.flushBeforeCompaction()`

- [ ] T31 修改 `claudeClient.ts` 的 `streamClaude()` 集成记忆（依赖 T30） <!-- id: 31 -->
  - 会话启动前：调用 `memoryManager.loadSessionContext(userId)` 并 `buildMemoryPrompt()`
  - 将记忆上下文追加到 `queryOptions.systemPrompt`
  - 将 `memoryHooks` 合并到 `queryOptions.hooks`

- [ ] T32 验证 SDK Hooks 集成：对话启动时 system prompt 包含记忆内容 <!-- id: 32 -->

- [ ] T33 验证 PostModelTurn Hook：对话结束后短期记忆文件和 agent_memories 有新数据 <!-- id: 33 -->

**检查点**：对话中 AI 能引用上一次对话的偏好信息

---

## 第4阶段：服务层 + API

**目的**：暴露 REST API 供前端使用

### 服务层

- [ ] T40 [P] 实现 `src/server/service/memoryService.ts`（依赖 T20） <!-- id: 40 -->
  - `createMemory(userId, data)` / `updateMemory(userId, id, data)` / `deleteMemory(userId, id)`
  - `listMemories(userId, category?)` → 按 importance DESC, updatedAt DESC
  - `retrieveRelevantMemories(userId, limit=10)` → 供 LangGraph 直接调用
  - `getProfiles(userId)` / `upsertProfile(userId, type, content)`

### API Route

- [ ] T41 实现 `src/app/api/memory/route.ts`（依赖 T40） <!-- id: 41 -->
  - `GET /api/memory?category=` → 列出长期记忆
  - `POST /api/memory` → 创建（source=user_explicit）
  - `PUT /api/memory/[id]` → 更新
  - `DELETE /api/memory/[id]` → 软删除
  - `GET /api/memory/profile?type=` → 获取身份配置
  - `PUT /api/memory/profile` → 更新身份配置

- [ ] T42 添加 Zod 请求验证 + 错误处理 <!-- id: 42 -->

- [ ] T43 编写 API 集成测试 <!-- id: 43 -->

**检查点**：API 端点可正常调用，返回正确数据

---

## 第5阶段：User Story P2 - 手动管理长期记忆 🎯 MVP UI

**目标**：用户可在设置页面 CRUD 长期记忆，下次对话 AI 会引用
**独立测试**：在设置页面添加"偏好价值投资"，开始新对话，AI 回复中引用该偏好

### 状态管理

- [ ] T50 [P] [US2] 实现 `src/app/store/memory/index.ts`（Zustand） <!-- id: 50 -->
  - State：`memories[]`、`loading`、`error`、`activeCategory`
  - Actions：`fetchMemories`、`createMemory`、`updateMemory`、`deleteMemory`、`setCategory`

### UI 组件

- [ ] T51 [P] [US2] 实现记忆管理页面 `src/app/(pages)/settings/memory/page.tsx` <!-- id: 51 -->
  - 记忆列表（展示 content、category badge、importance 星级、source 来源标签）
  - 分类筛选 Tabs（全部 / 投资偏好 / 持仓规则 / 市场洞察 / 投资决策）
  - 空状态引导文案："记忆的提取是渐进式的，积累更多对话，助理会更懂你"

- [ ] T52 [US2] 实现新增/编辑记忆 Dialog <!-- id: 52 -->
  - content textarea、category select、importance slider(1-10)
  - 表单验证 + 保存/取消

- [ ] T53 [US2] 实现删除确认 Dialog <!-- id: 53 -->

- [ ] T54 [US2] 在 Settings 侧边栏导航中添加「记忆」入口（Brain 图标） <!-- id: 54 -->

- [ ] T55 [US2] 添加 i18n 翻译键（zh-CN + en-US） <!-- id: 55 -->
  - 页面标题、按钮、分类标签、空状态文案、表单 label

- [ ] T56 [US2] 验证响应式布局 <!-- id: 56 -->

**检查点**：US P2 功能完整可用，AI 在对话中引用手动添加的记忆

---

## 第6阶段：User Story P1 - 渐进式自动提取记忆

**目标**：对话后自动提取偏好，3次以上对话后效果明显提升
**独立测试**：对话中说"我偏好价值投资，不喜欢追涨"，结束后 agent_memories 出现新条目

- [ ] T60 [US1] 在 saveMemoryNode 中实现渐进式触发逻辑 <!-- id: 60 -->
  - 前 2 次对话：只写短期记忆文件，不触发 extractor
  - 第 3+ 次对话：触发 MemoryExtractor，增量 upsert

- [ ] T61 [US1] 初始化 Agent Soul Profile（第一次使用时自动创建） <!-- id: 61 -->
  - 投资分析师身份定义（参考 openclaw-memory-design.md §2.8）
  - 包含：核心身份、行为准则、记忆管理规则

- [ ] T62 [US1] 在对话 UI 中展示"记忆已更新"轻提示 <!-- id: 62 -->
  - saveMemoryNode 完成后通过 SSE/WebSocket 推送通知
  - 前端显示 toast："助理记住了一些新内容"

- [ ] T63 [US1] 验证渐进式提取效果 <!-- id: 63 -->
  - 3 次对话后 agent_memories 有正确分类的条目
  - 重复信息不重复写入（upsert 去重）

**检查点**：US P1 验证通过

---

## 第7阶段：User Story P3 - 高价值记忆自动晋升

**目标**：importance >= 7 的短期记忆自动成为长期记忆
**独立测试**：用户明确说"我的止损线是5%，这是铁律"，系统自动升入长期记忆

- [ ] T70 [US3] 在 MemoryFlusher.flush() 和 saveMemoryNode 中实现晋升逻辑 <!-- id: 70 -->
  - importance >= 7 的条目 upsert 到 agent_memories
  - source 标记为 `agent_extracted`

- [ ] T71 [US3] 在记忆管理页面展示自动提取的记忆（source=agent_extracted 标签区分） <!-- id: 71 -->

- [ ] T72 [US3] 验证晋升流程 <!-- id: 72 -->

**检查点**：US P3 验证通过

---

## 第8阶段：User Story P4 - 上下文压缩前记忆冲刷

**目标**：长会话 token 接近上限时，重要内容自动持久化
**独立测试**：模拟长会话，token 接近阈值，flush 后重启会话，AI 依然记得关键决策

- [ ] T80 [US4] 在 LangGraph Agent 的 token 监测点调用 `MemoryFlusher.shouldFlush()` <!-- id: 80 -->
- [ ] T81 [US4] 触发 flush 后向前端发送轻提示（"正在整理记忆..."） <!-- id: 81 -->
- [ ] T82 [US4] 验证 flush 后重启会话，记忆内容完整保留 <!-- id: 82 -->

**检查点**：US P4 验证通过

---

## 第9阶段：完善与质量保证

- [ ] T90 [P] 运行 `npm run lint` 并修复所有问题 <!-- id: 90 -->
- [ ] T91 [P] 运行 `npm run types:check` 确保零类型错误 <!-- id: 91 -->
- [ ] T92 运行 `npm test` 确保所有测试通过 <!-- id: 92 -->
- [ ] T93 性能审查：记忆检索确保 < 100ms（SQLite explain query plan） <!-- id: 93 -->
- [ ] T94 安全审查：所有 DB 查询验证 userId 隔离 <!-- id: 94 -->

---

## 第10阶段：归档准备

- [ ] T100 确认所有 tasks 状态为完成 <!-- id: 100 -->
- [ ] T101 验证 spec.md 中所有场景均已实现 <!-- id: 101 -->
- [ ] T102 更新 spec.md 中仍引用旧路径的场景描述 <!-- id: 102 -->

---

## 依赖关系

```
第0阶段（准备）
    ↓
第1阶段（Schema + Migration） ← 所有后续工作的基础
    ↓
第2阶段（Core Memory Modules）← 并行：T20/T21/T23/T24 可并行，T22依赖T21，T25依赖T23，T26依赖T20-T25
    ↓
第3阶段（SDK Hooks集成）+ 第4阶段（Service+API）← 可并行进行
    ↓
第5阶段（手动管理UI）← MVP
    ↓
第6阶段（渐进式提取）+ 第7阶段（自动晋升）← 可并行
    ↓
第8阶段（Flush冲刷）
    ↓
第9阶段（QA）→ 第10阶段（归档）
```

### 关键并行机会

- T10（Schema 两表）与 T14（Types 定义）可并行
- T20（Repository）、T21（Embedding）、T23（ShortTermMemory）、T24（Extractor）可并行
- T30（loadMemoryNode）与 T40（Service）可并行
- T50（Store）与 T51（UI 框架）可并行
