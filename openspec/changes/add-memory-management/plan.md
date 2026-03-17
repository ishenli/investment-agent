# 实现计划：Memory Management

**分支**：`add-memory-management` | **日期**：2026-03-13 | **规范**：memory-management
**输入**：用户需求 - 为投资助手添加记忆功能

## 概要

为投资分析应用添加双层记忆管理系统：

### 短期记忆（User-Level, 3 天）
- **技术方案**：Claude Agent SDK Hooks + 工作区 Markdown
- **特点**：实时、自动、用户级、3 天滚动
- **用途**：最近 3 天对话上下文、AI 自动提取的偏好
- **清理**：自动删除超过 3 天的记忆

### 长期记忆（Persistent）
- **技术方案**：SQLite + Drizzle ORM
- **特点**：持久、结构化、跨会话
- **用途**：用户手动添加、需要永久保留的记忆

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, Claude Agent SDK, Drizzle ORM
**存储**：
- 短期记忆：`.investment-agent/memory/*.md` (工作区文件)
- 长期记忆：SQLite `memories` 表
**测试**：Vitest
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：记忆检索 < 100ms，记忆注入不增加对话延迟
**约束条件**：必须兼容现有 Claude Agent SDK 集成，支持多用户隔离

## 规范检查

- ✅ 符合项目规范（见 `.claude/rules/` 目录）
- ✅ TypeScript 严格模式
- ✅ OpenSpec delta 格式

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-memory-management/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── memory/
        └── spec.md          # Delta 变更
```

### 源代码（项目根目录）

```text
src/
├── app/
│   ├── api/
│   │   └── memory/
│   │       └── route.ts     # 记忆管理 API
│   └── (pages)/
│       └── settings/
│           └── memory/      # 记忆管理页面
├── server/
│   ├── repository/
│   │   └── memoryRepository.ts
│   └── service/
│       └── memoryService.ts
├── renderer/
│   └── store/
│       └── memory.ts        # 记忆状态管理
└── drizzle/
    └── schema.ts            # 新增 memories 表
```

**结构决策**：遵循现有项目架构，Repository -> Service -> API -> Store -> UI

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 作为用户，我可以手动添加投资相关的记忆，系统会在对话中自动使用这些记忆 | 在设置页面添加记忆，开始新对话，AI 引用该记忆 |
| P2 | 作为用户，AI 可以在对话中自动提取并保存我的投资偏好 | 对话中提及偏好，系统自动创建记忆 |
| P3 | 作为用户，我可以查看、编辑、删除我的记忆 | 在记忆管理页面进行 CRUD 操作 |

## 技术架构

### 数据流
```
[对话消息] → [Chat Graph] → [Memory Extraction Node] → [MemoryService]
                                                    ↓
[对话上下文] ← [Memory Injection] ← [MemoryService.retrieve()]
```

### 记忆类型设计

```typescript
type MemoryCategory =
  | 'investment_preference'  // 投资偏好（如：偏好科技股、价值投资）
  | 'risk_tolerance'         // 风险承受能力
  | 'trading_strategy'       // 交易策略
  | 'position_rule'          // 持仓规则
  | 'market_view'            // 市场观点
  | 'personal_info'          // 个人信息
  | 'other';                 // 其他
```

### 状态管理
- **服务端**: MemoryService + MemoryRepository
- **客户端**: Zustand store (memory.ts)
- **缓存策略**: 对话开始时加载相关记忆，缓存到 session

### 外部集成
- **LangGraph**: 在 Chat Graph 中添加 Memory Extraction 节点
- **数据库**: 新增 `memories` 表

## 短期记忆设计：SDK Hooks + Markdown

### Claude Agent SDK Hooks

使用 SDK 的 `Options.hooks` 机制实现自动记忆提取：

```typescript
// SDK Hooks 配置
queryOptions.hooks = {
  // 工具使用后触发，检查是否需要提取记忆
  PostToolUse: [{
    hooks: [async (input: PostToolUseHookInput) => {
      // 分析工具响应，提取用户偏好信息
      // 自动创建短期记忆文件
      return {};
    }],
  }],
  // 通知钩子，用于记忆更新通知
  Notification: [{
    hooks: [async (input: NotificationHookInput) => {
      // 处理通知，更新记忆状态
      return {};
    }],
  }],
};
```

### 短期记忆文件结构（用户维度）

```
.investment-agent/memory/
└── users/
    └── {userId}/
        ├── preferences.md      # 用户偏好（自动提取）
        ├── context.md          # 当前对话上下文
        └── extracted.md        # 提取的关键信息
```

**Markdown 格式**：
```markdown
---
category: investment_preference
source: auto
created_at: 2026-03-13T10:00:00Z
updated_at: 2026-03-13T12:00:00Z
importance: 7
---

# 用户投资偏好

- 偏好科技股投资
- 风险承受能力：中等
- 常用交易策略：分批建仓
```

### 3 天自动清理机制

```typescript
// 在 memoryFileService.ts 中实现
function cleanupExpiredMemories(userId: string) {
  const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
  const userMemoryDir = `.investment-agent/memory/users/${userId}`;

  // 读取所有 markdown 文件
  // 检查 frontmatter 中的 updated_at
  // 删除超过 3 天的文件
}

// 每次读取短期记忆时自动触发清理
readShortTermMemories(userId: string) {
  cleanupExpiredMemories(userId);
  // ... 读取文件
}
```

## 长期记忆设计：SQLite Schema

```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,           -- 记忆内容
  category TEXT NOT NULL,          -- 记忆分类
  importance INTEGER DEFAULT 5,    -- 重要性 1-10
  source TEXT DEFAULT 'manual',    -- 来源：manual | auto
  session_id TEXT,                 -- 来源会话（自动提取时）
  embedding BLOB,                  -- 向量嵌入（未来扩展）
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP             -- 软删除
);

CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_category ON memories(category);
CREATE INDEX idx_memories_deleted_at ON memories(deleted_at);
```

## 记忆同步流程

```
[对话开始]
    ↓
[加载长期记忆] → 注入到 System Prompt
    ↓
[对话进行中] → SDK Hooks 捕获信息 → 写入短期记忆文件
    ↓
[对话结束] → 用户确认 → 同步到长期记忆（SQLite）
```

## 复杂性跟踪

> 本次设计保持简单，无违规需要说明

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 记忆过多影响对话上下文 | 中 | 按重要性排序，限制注入数量 |
| 自动提取记忆不准确 | 低 | 用户可编辑/删除，初期仅提取明确信息 |
| 记忆隐私问题 | 高 | 数据隔离，仅用户可见 |

## 性能考虑

- 记忆检索: < 100ms（使用索引优化）
- 记忆注入: 限制最多 10 条记忆
- 自动提取: 异步执行，不阻塞对话

## 安全考虑

- 用户数据隔离：所有记忆操作必须验证 userId
- 敏感信息：不存储 API Key、密码等敏感信息
- 软删除：记忆删除使用软删除，保留审计记录

## 测试策略

- **单元测试**: MemoryService 方法覆盖
- **集成测试**: API 端点测试
- **E2E 测试**: 记忆注入对话流程