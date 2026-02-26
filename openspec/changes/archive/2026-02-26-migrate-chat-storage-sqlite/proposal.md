# Change: Migrate Chat Storage from Dexie.js to SQLite

## Why

当前聊天数据存储在客户端 IndexedDB (via Dexie.js)，导致：
- 数据无法跨设备同步
- 无法实现服务端备份和恢复
- 与项目其他功能（账户、资产）的 SQLite 存储架构不一致

将聊天存储迁移到服务端 SQLite 可以实现统一的数据管理架构。

## What Changes

### 架构变更

| 层级 | 当前实现 (Dexie) | 目标实现 (SQLite) |
|------|-----------------|------------------|
| 数据库 | `src/app/database/core/db.ts` (Dexie.js) | `drizzle/schema/chat.ts` (Drizzle ORM) |
| Model 层 | `src/app/database/models/*.ts` (BaseModel) | `src/server/repository/chat/*.ts` (Repository Pattern) |
| Service 层 | `src/app/services/*/client.ts` (ClientService) | `src/server/service/chatStorageService.ts` (ServerService) |
| API 层 | 无（客户端直接访问 IndexedDB） | `src/app/api/chat/*/route.ts` (REST API) |
| Store 层 | 直接调用 Service | 通过 API Client 调用 |

### 具体变更

#### 1. 数据库层 (BREAKING)

**删除文件：**
```
src/app/database/
├── core/
│   ├── db.ts              # Dexie 数据库配置
│   ├── model.ts           # BaseModel 基类
│   ├── schemas.ts         # Schema 版本历史
│   └── types/
│       └── db.ts          # 数据库类型定义
├── models/
│   ├── message.ts         # MessageModel
│   ├── session.ts         # SessionModel
│   ├── topic.ts           # TopicModel
│   ├── file.ts            # FileModel
│   ├── sessionGroup.ts    # SessionGroupModel
│   ├── plugin.ts          # PluginModel
│   └── user.ts            # UserModel
└── schemas/
    ├── message.ts         # Message Zod Schema
    ├── session.ts         # Session Zod Schema
    ├── topic.ts           # Topic Zod Schema
    ├── file.ts            # File Zod Schema
    ├── sessionGroup.ts    # SessionGroup Zod Schema
    ├── plugin.ts          # Plugin Zod Schema
    ├── user.ts            # User Zod Schema
    └── thread.ts          # Thread Zod Schema
```

**新增文件：**
```
drizzle/schema/
└── chat.ts                # 聊天相关表 Schema

src/server/repository/chat/
├── base.ts                # BaseRepository 基类
├── session.ts             # SessionRepository
├── topic.ts               # TopicRepository
├── message.ts             # MessageRepository
├── thread.ts              # ThreadRepository
├── file.ts                # FileRepository
├── sessionGroup.ts        # SessionGroupRepository
└── plugin.ts              # PluginRepository
```

#### 2. Service 层 (BREAKING)

**删除文件：**
```
src/app/services/
├── message/
│   └── client.ts          # Message ClientService
├── session/
│   └── client.ts          # Session ClientService
├── topic/
│   └── client.ts          # Topic ClientService
├── file/
│   └── client.ts          # File ClientService
└── plugin/
    └── client.ts          # Plugin ClientService
```

**新增文件：**
```
src/server/service/
└── chatStorageService.ts  # 统一聊天存储服务
```

#### 3. API 层 (新增)

**新增文件：**
```
src/app/api/chat/
├── sessions/
│   ├── route.ts           # GET, POST /api/chat/sessions
│   └── [id]/
│       └── route.ts       # GET, PUT, DELETE /api/chat/sessions/[id]
├── topics/
│   ├── route.ts           # GET, POST /api/chat/topics
│   └── [id]/
│       └── route.ts       # GET, PUT, DELETE /api/chat/topics/[id]
├── messages/
│   ├── route.ts           # GET, POST /api/chat/messages
│   └── [id]/
│       └── route.ts       # GET, PUT, DELETE /api/chat/messages/[id]
├── threads/
│   ├── route.ts           # GET, POST /api/chat/threads
│   └── [id]/
│       └── route.ts       # GET, PUT, DELETE /api/chat/threads/[id]
└── files/
    ├── route.ts           # GET, POST /api/chat/files
    └── [id]/
        └── route.ts       # GET, DELETE /api/chat/files/[id]
```

#### 4. Store 层 (修改)

**修改文件：**
```
src/app/store/chat/
├── store.ts               # 导入 API Client
├── slices/
│   ├── message/
│   │   ├── action.ts      # 使用 API Client 替代 Service
│   │   └── selectors.ts   # 保持不变
│   └── topic/
│       └── action.ts      # 使用 API Client 替代 Service
```

**新增文件：**
```
src/app/api/chat/
└── client.ts              # Chat API Client
```

## Impact

### Affected Specs
- `chat-storage` (NEW) - 新增聊天存储规范
- `database` (MODIFIED) - 扩展现有数据库规范支持聊天表
- `chat-api` (MODIFIED) - 扩展 API 规范支持消息持久化

### Affected Code

| 目录 | 操作 | 说明 |
|------|------|------|
| `src/app/database/` | DELETE | 移除整个 Dexie 数据库层 |
| `src/app/services/*/client.ts` | DELETE | 移除客户端 Service 层 |
| `drizzle/schema/` | CREATE | 新增 chat.ts Schema |
| `src/server/repository/chat/` | CREATE | 新增 Repository 层 |
| `src/server/service/` | CREATE | 新增 ChatStorageService |
| `src/app/api/chat/` | CREATE | 新增 REST API Routes |
| `src/app/api/chat/client.ts` | CREATE | 新增 API Client |
| `src/app/store/chat/` | MODIFY | 更新数据获取逻辑 |
| `package.json` | MODIFY | 移除 dexie 依赖 |

### 依赖变更

**移除依赖：**
```json
{
  "dexie": "^x.x.x"
}
```

**无新增依赖**（Drizzle ORM 已存在）

## 数据模型映射详情

### 表命名规范

遵循现有 Drizzle schema 的 snake_case 命名规范：
- `chat_sessions` (对应 Dexie `sessions`)
- `chat_topics` (对应 Dexie `topics`)
- `chat_messages` (对应 Dexie `messages`)
- `chat_threads` (对应 Dexie `threads`)
- `chat_files` (对应 Dexie `files`)
- `chat_session_groups` (对应 Dexie `sessionGroups`)
- `chat_plugins` (对应 Dexie `plugins`)

### 字段命名规范

遵循现有 schema 的 snake_case 命名：
- `session_id` (对应 Dexie `sessionId`)
- `topic_id` (对应 Dexie `topicId`)
- `tool_call_id` (对应 Dexie `tool_call_id` - 已是 snake_case)
- `created_at` (对应 Dexie `createdAt`)
- `updated_at` (对应 Dexie `updatedAt`)

### 类型映射

| Dexie 类型 | Drizzle 类型 | 说明 |
|-----------|-------------|------|
| `string` | `text()` | 字符串 |
| `number` (时间戳) | `integer({ mode: 'timestamp' })` | 时间戳 |
| `number` (普通) | `integer()` | 整数 |
| `ArrayBuffer` | `text()` | Base64 编码 |
| `any` (JSON) | `text({ mode: 'json' })` | JSON 对象 |
| `enum` | `text({ enum: [...] })` | 枚举 |

## 迁移策略

### 不迁移历史数据

由于用户确认不保留历史数据：
- 无需编写数据迁移脚本
- 新用户直接使用 SQLite 存储
- 旧的 IndexedDB 数据将被废弃

### 渐进式迁移

1. **Phase 1**: 创建 SQLite Schema 和 Repository 层
2. **Phase 2**: 创建 Service 层和 API Routes
3. **Phase 3**: 更新 Store 层使用 API Client
4. **Phase 4**: 删除旧的 Dexie 代码
5. **Phase 5**: 测试和清理

## 风险和缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| API 响应延迟 | 中 | 使用 SWR 缓存，乐观更新 |
| 网络错误 | 高 | 添加错误处理和重试机制 |
| 数据一致性 | 中 | 使用事务处理级联操作 |
| 离线不可用 | 高 | 明确告知用户需要网络连接 |