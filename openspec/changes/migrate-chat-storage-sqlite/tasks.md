# 任务：Migrate Chat Storage to SQLite

**输入**：来自 `/openspec/changes/migrate-chat-storage-sqlite/plan.md` 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm tsc --noEmit`
- 代码检查：`pnpm lint`
- 单元测试：`pnpm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 路径约定

| 类型 | 路径 |
|------|------|
| API Routes | `src/app/api/chat/[resource]/route.ts` |
| Service | `src/server/service/chatStorageService.ts` |
| Repository | `src/server/repository/chat/` |
| Schema | `drizzle/schema/chat.ts` |
| Store | `src/app/store/chat/` |

---

## 第0阶段：准备（设计与验证）

- [x] T00 创建变更目录结构 `openspec/changes/migrate-chat-storage-sqlite/`
- [x] T01 编写 proposal.md 描述变更意图和影响
- [x] T02 编写 plan.md 技术设计方案
- [x] T03 编写 spec delta 规范变更
- [x] T04 运行 `openspec validate migrate-chat-storage-sqlite --strict` 验证

---

## 第1阶段：设置（基础设施）

**目的**：项目初始化和类型定义

- [x] T05 在 `drizzle/schema/chat.ts` 中定义聊天表 Schema
- [x] T06 [P] 类型定义已包含在 Schema 文件中
- [x] T07 更新 `drizzle/schema.ts` 导入聊天 Schema
- [x] T08 运行 `pnpm db:generate` 生成迁移文件
- [ ] T09 运行 `pnpm db:migrate` 应用迁移

---

## 第2阶段：基础（Repository 层）

**目的**：数据访问层实现，使用 Drizzle ORM

**⚠️ 关键**：此阶段完成前不应开始 Service/API 工作

- [x] T10 创建 `src/server/repository/chat/base.ts` BaseRepository
- [x] T11 [P] 创建 `src/server/repository/chat/session.ts` SessionRepository
- [x] T12 [P] 创建 `src/server/repository/chat/topic.ts` TopicRepository
- [x] T13 [P] 创建 `src/server/repository/chat/message.ts` MessageRepository
- [x] T14 [P] 创建 `src/server/repository/chat/thread.ts` ThreadRepository
- [x] T15 [P] 创建 `src/server/repository/chat/file.ts` FileRepository
- [x] T16 [P] 创建 `src/server/repository/chat/plugin.ts` PluginRepository
- [x] T17 创建 `src/server/repository/chat/index.ts` 统一导出
- [x] T18 修复 Repository 层 TypeScript 类型错误

---

## 第3阶段：Service 层

- [x] T19 创建 `src/server/service/chatStorageService.ts` 统一服务
- [x] T20 实现 Session 服务方法
- [x] T21 [P] 实现 Topic 服务方法
- [x] T22 [P] 实现 Message 服务方法
- [x] T23 [P] 实现 File 服务方法
- [ ] T24 编写服务层单元测试

**检查点**：业务逻辑就绪，可以开始 API 实现

---

## 第4阶段：API

- [x] T25 在 `src/app/api/chat/sessions/route.ts` 实现 Session API
- [x] T26 [P] 在 `src/app/api/chat/topics/route.ts` 实现 Topic API
- [x] T27 [P] 在 `src/app/api/chat/messages/route.ts` 实现 Message API
- [x] T28 添加请求验证（Zod schema）
- [ ] T29 添加错误处理和日志记录

---

## 第5阶段：User Story 1 - 会话管理 (优先级：P1) 🎯 MVP

**目标**：用户可以创建和管理聊天会话
**独立测试**：创建会话，刷新页面后会话仍存在

### 实现

- [x] T30 [US1] 创建 API Client `src/app/api/chat/client.ts`
- [x] T31 [US1] 更新 `src/app/store/chat/` 使用 API Client
  - 创建 `src/app/services/topic/serverClient.ts` - Topic API 服务
  - 创建 `src/app/services/message/serverClient.ts` - Message API 服务
  - 更新 `src/app/services/topic/index.ts` - 导出 ServerService
  - 更新 `src/app/services/message/index.ts` - 导出 ServerService
- [ ] T32 [US1] 验证会话列表持久化

**检查点**：会话管理功能完整可用

---

## 第6阶段：User Story 2 - 消息管理 (优先级：P2)

**目标**：用户可以在会话中发送和接收消息
**独立测试**：发送消息，刷新页面后历史记录可追溯

### 实现

- [x] T33 [US2] 更新 Message Store 连接 API
- [x] T34 [US2] 实现消息发送和接收流程
- [ ] T35 [US2] 验证消息历史持久化

---

## 第7阶段：清理与迁移

- [ ] T36 删除 `src/app/database/` 目录（Dexie 层）
- [ ] T37 [P] 删除 `src/app/services/session/client.ts`
- [ ] T38 [P] 删除 `src/app/services/topic/client.ts`
- [ ] T39 [P] 删除 `src/app/services/message/client.ts`
- [ ] T40 更新 `package.json` 移除 Dexie 依赖

---

## 第8阶段：完善与质量保证

**目的**：跨用户的改进和质量检查

- [ ] T41 运行 `pnpm lint` 并修复问题
- [ ] T42 运行 `pnpm tsc --noEmit` 确保类型正确
- [ ] T43 添加网络错误处理和重试机制

---

## 第9阶段：归档准备

- [ ] T44 验证所有场景在 spec.md 中已实现
- [ ] T45 运行 `openspec validate migrate-chat-storage-sqlite --strict`

---

## 依赖关系

### 阶段依赖

- **准备（第0阶段）**：✅ 完成
- **设置（第1阶段）**：✅ 完成（迁移待运行）
- **Repository 层（第2阶段）**：✅ 完成
- **Service 层（第3阶段）**：✅ 完成（测试待编写）
- **API（第4阶段）**：✅ 完成
- **User Stories**：⏳ 进行中
- **清理**：依赖所有 User Stories 完成

### 当前状态

- ✅ Schema 定义完成
- ✅ 迁移文件生成完成
- ✅ Repository 层实现完成
- ✅ Service 层实现完成
- ✅ API Routes 实现完成
- ✅ ChatController 实现完成
- ✅ Zod 验证 Schema 完成
- ✅ API Client 完成
- ⏳ 下一阶段：Store 层集成