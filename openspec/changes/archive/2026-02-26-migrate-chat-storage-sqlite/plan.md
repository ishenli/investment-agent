# 实现计划：Migrate Chat Storage to SQLite

**分支**：`ishenli/chat-storage-sqlite` | **日期**：2026-02-22 | **规范**：`openspec/changes/migrate-chat-storage-sqlite/specs/`
**输入**：来自聊天存储迁移需求

## 概要

将聊天存储从客户端 Dexie.js (IndexedDB) 迁移到服务端 SQLite，实现统一的数据管理架构。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, Drizzle ORM, LibSQL
**存储**：SQLite (服务端，通过 Drizzle ORM)
**测试**：Vitest
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：API 响应 < 500ms，聊天加载 < 1s
**约束条件**：必须兼容 Electron, 不保留历史数据

## 规范检查

- [x] 检查是否符合项目规范
- [x] 检查 TypeScript 严格模式约束
- [x] 检查 OpenSpec delta 格式正确性

## 项目结构

### 文档（此功能）

```text
openspec/changes/migrate-chat-storage-sqlite/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    ├── chat-storage/
    │   └── spec.md          # 新增能力规范
    └── database/
        └── spec.md          # 数据库规范扩展
```

### 源代码（项目根目录）

```text
src/
├── app/
│   ├── api/
│   │   └── chat/            # 聊天 API Routes
│   │       ├── sessions/
│   │       ├── topics/
│   │       ├── messages/
│   │       └── threads/
│   └── (pages)/chat/        # 聊天页面
├── server/
│   ├── repository/
│   │   └── chat/            # Repository 层 (新增)
│   │       ├── base.ts
│   │       ├── session.ts
│   │       ├── topic.ts
│   │       ├── message.ts
│   │       └── ...
│   └── service/
│       └── chatStorageService.ts  # 聊天存储服务
├── renderer/
│   └── store/
│       └── chat/            # 聊天状态管理
└── shared/
    └── types/
        └── chat.ts          # 聊天类型定义
drizzle/
└── schema/
    └── chat.ts              # 聊天表 Schema
```

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 用户可以创建和管理聊天会话 | 创建会话，刷新后仍存在 |
| P2 | 用户可以在会话中发送和接收消息 | 发送消息，历史记录可追溯 |
| P3 | 用户可以管理话题和文件 | 创建话题，上传文件 |

---

## 技术架构

### 架构对比

#### 当前架构 (Dexie)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                               │
├─────────────────────────────────────────────────────────────────┤
│  React Components                                                │
│       ↓                                                          │
│  Zustand Store (src/app/store/chat/)                            │
│       ↓                                                          │
│  ClientService (src/app/services/*/client.ts)                   │
│       ↓                                                          │
│  BaseModel (src/app/database/core/model.ts)                     │
│       ↓                                                          │
│  Dexie.js → IndexedDB (TINA_CHAT_DB)                            │
└─────────────────────────────────────────────────────────────────┘
```

#### 目标架构 (SQLite)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                               │
├─────────────────────────────────────────────────────────────────┤
│  React Components                                                │
│       ↓                                                          │
│  Zustand Store (src/app/store/chat/)                            │
│       ↓                                                          │
│  API Client (src/app/api/chat/client.ts)                        │
│       ↓ HTTP                                                     │
├─────────────────────────────────────────────────────────────────┤
│                        SERVER SIDE                               │
├─────────────────────────────────────────────────────────────────┤
│  API Routes (src/app/api/chat/*/route.ts)                       │
│       ↓                                                          │
│  ChatStorageService (src/server/service/chatStorageService.ts)  │
│       ↓                                                          │
│  Repository (src/server/repository/chat/*.ts)                   │
│       ↓                                                          │
│  Drizzle ORM → SQLite (chat_sessions, chat_messages, ...)       │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流

```
[用户操作] → [Chat Store] → [API Client] → [API Route] → [ChatStorageService] → [Repository] → [Drizzle ORM] → [SQLite]
                                ↓
                           [UI 更新]
```

### 状态管理

- **服务端**: Drizzle ORM 管理 SQLite 数据库
- **客户端**: Zustand Store 管理 UI 状态和 API 调用
- **缓存策略**: SWR 用于数据获取和缓存

---

## 代码实现模式

### 1. Drizzle Schema 定义

参考现有 `drizzle/schema.ts` 的模式：

```typescript
// drizzle/schema/chat.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './schema'; // 引用现有 users 表

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  slug: text('slug').notNull().unique(),
  type: text('type', { enum: ['agent', 'group'] }).notNull(),
  groupId: text('group_id'),
  pinned: integer('pinned', { mode: 'boolean' }).default(false),
  config: text('config', { mode: 'json' }).notNull(),
  meta: text('meta', { mode: 'json' }).notNull(),
  agentId: text('agent_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  index('idx_chat_sessions_user_id').on(table.userId),
  index('idx_chat_sessions_updated_at').on(table.updatedAt),
]);

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessions.id, { onDelete: 'cascade' }),
  topicId: text('topic_id')
    .references(() => chatTopics.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'),
  role: text('role', { enum: ['user', 'system', 'assistant', 'tool'] }).notNull(),
  content: text('content').notNull(),
  files: text('files', { mode: 'json' }),
  favorite: integer('favorite').default(0),
  userLikeTag: text('user_like_tag', { enum: ['like', 'dislike', 'unknown'] }),
  error: text('error', { mode: 'json' }),
  reasoning: text('reasoning', { mode: 'json' }),
  tools: text('tools', { mode: 'json' }),
  toolCallId: text('tool_call_id'),
  plugin: text('plugin', { mode: 'json' }),
  pluginState: text('plugin_state', { mode: 'json' }),
  model: text('model'),
  provider: text('provider'),
  traceId: text('trace_id'),
  observationId: text('observation_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  index('idx_chat_messages_session_topic').on(table.sessionId, table.topicId),
  index('idx_chat_messages_created_at').on(table.createdAt),
]);
```

### 2. Repository 层模式

参考现有 BaseModel 模式，但使用 Drizzle：

```typescript
// src/server/repository/chat/base.ts
import { db } from '@server/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from '@shared/lib/utils/uuid';

export abstract class BaseRepository<T extends { id: string }> {
  constructor(
    protected table: any,
    protected idGenerator: () => string = nanoid
  ) {}

  protected async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.idGenerator();
    const now = new Date();

    await db.insert(this.table).values({
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  }

  protected async findById(id: string): Promise<T | undefined> {
    const results = await db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1);

    return results[0] as T | undefined;
  }

  protected async update(id: string, data: Partial<T>): Promise<boolean> {
    const result = await db
      .update(this.table)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(this.table.id, id));

    return result.changes > 0;
  }

  protected async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(this.table)
      .where(eq(this.table.id, id));

    return result.changes > 0;
  }
}
```

### 3. Service 层模式

参考现有 ClientService 模式：

```typescript
// src/server/service/chatStorageService.ts
import { SessionRepository } from '@server/repository/chat/session';
import { TopicRepository } from '@server/repository/chat/topic';
import { MessageRepository } from '@server/repository/chat/message';

export class ChatStorageService {
  private sessionRepo = new SessionRepository();
  private topicRepo = new TopicRepository();
  private messageRepo = new MessageRepository();

  // Session operations
  async createSession(userId: number, data: CreateSessionParams) {
    return this.sessionRepo.create({ ...data, userId });
  }

  async getSessions(userId: number) {
    return this.sessionRepo.findByUserId(userId);
  }

  async updateSession(id: string, data: UpdateSessionParams) {
    return this.sessionRepo.update(id, data);
  }

  async deleteSession(id: string) {
    // 级联删除由数据库外键处理
    return this.sessionRepo.delete(id);
  }

  // Message operations
  async createMessage(data: CreateMessageParams) {
    return this.messageRepo.create(data);
  }

  async getMessages(sessionId: string, topicId?: string) {
    return this.messageRepo.findBySessionAndTopic(sessionId, topicId);
  }

  // ... 其他方法
}

export const chatStorageService = new ChatStorageService();
```

### 4. API Route 模式

参考项目现有的 Controller 模式：

```typescript
// src/app/api/chat/sessions/route.ts
import { NextRequest } from 'next/server';
import { BaseController } from '@api/base/baseController';
import { chatStorageService } from '@server/service/chatStorageService';
import { AuthService } from '@server/service/authService';
import { z } from 'zod';

const CreateSessionSchema = z.object({
  slug: z.string(),
  type: z.enum(['agent', 'group']),
  config: z.object({}).passthrough(),
  meta: z.object({}).passthrough(),
});

class SessionController extends BaseController {
  static async GET(request: NextRequest) {
    try {
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const sessions = await chatStorageService.getSessions(userId);
      return Response.json({ sessions });
    } catch (error) {
      return Response.json({ error: 'Failed to get sessions' }, { status: 500 });
    }
  }

  static async POST(request: NextRequest) {
    try {
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const validated = CreateSessionSchema.parse(body);

      const id = await chatStorageService.createSession(userId, validated);
      return Response.json({ id }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json({ error: error.errors }, { status: 400 });
      }
      return Response.json({ error: 'Failed to create session' }, { status: 500 });
    }
  }
}

export const GET = SessionController.GET;
export const POST = SessionController.POST;
```

### 5. API Client 模式

```typescript
// src/app/api/chat/client.ts
import { request } from '@renderer/lib/request';

export const chatApiClient = {
  // Sessions
  getSessions: () => request.get('/api/chat/sessions'),
  createSession: (data: CreateSessionParams) => request.post('/api/chat/sessions', data),
  updateSession: (id: string, data: UpdateSessionParams) =>
    request.put(`/api/chat/sessions/${id}`, data),
  deleteSession: (id: string) => request.delete(`/api/chat/sessions/${id}`),

  // Messages
  getMessages: (sessionId: string, topicId?: string) =>
    request.get('/api/chat/messages', { params: { sessionId, topicId } }),
  createMessage: (data: CreateMessageParams) =>
    request.post('/api/chat/messages', data),
  updateMessage: (id: string, data: UpdateMessageParams) =>
    request.put(`/api/chat/messages/${id}`, data),
  deleteMessage: (id: string) =>
    request.delete(`/api/chat/messages/${id}`),

  // Topics
  getTopics: (sessionId: string) =>
    request.get('/api/chat/topics', { params: { sessionId } }),
  createTopic: (data: CreateTopicParams) =>
    request.post('/api/chat/topics', data),

  // ... 其他方法
};
```

---

## 数据库 Schema 详情

### 表关系图

```
users
  │
  └── chat_sessions (user_id → users.id)
        │
        ├── chat_topics (session_id → chat_sessions.id)
        │     │
        │     ├── chat_messages (topic_id → chat_topics.id)
        │     │     │
        │     │     └── chat_threads (topic_id → chat_topics.id, source_message_id → chat_messages.id)
        │     │
        │     └── chat_threads (topic_id → chat_topics.id)
        │
        ├── chat_messages (session_id → chat_sessions.id)
        │
        └── chat_files (session_id → chat_sessions.id)

chat_session_groups
  │
  └── chat_sessions (group_id → chat_session_groups.id)
```

### 索引策略

```typescript
// 复合索引示例
index('idx_chat_messages_session_topic').on(table.sessionId, table.topicId)
index('idx_chat_threads_topic_source').on(table.topicId, table.sourceMessageId)

// 单列索引
index('idx_chat_sessions_user_id').on(table.userId)
index('idx_chat_sessions_updated_at').on(table.updatedAt)
index('idx_chat_messages_created_at').on(table.createdAt)
```

---

## 性能考虑

- API 响应时间: < 500ms
- 消息分页加载: 每页 50 条
- 数据库索引: session_id, topic_id, created_at
- 使用 SWR 缓存减少重复请求
- 乐观更新提升 UI 响应速度

## 安全考虑

- 所有 API 需要用户认证
- 数据隔离：用户只能访问自己的聊天记录
- 输入验证：使用 Zod schema 验证所有输入
- 外键级联删除：确保数据完整性

## 测试策略

- **单元测试**: Repository 层 CRUD 操作
- **集成测试**: Service 层业务逻辑
- **API 测试**: Routes 端到端测试
- **E2E 测试**: 完整聊天流程测试