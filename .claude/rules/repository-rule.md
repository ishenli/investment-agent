# Repository 规范

## 1. 概述

Repository 层是项目数据访问层的唯一入口，负责封装所有 Drizzle ORM 数据库操作。Service 层只能通过 Repository 访问数据库，禁止在 Service 中直接调用 `db`。

---

## 2. 目录结构

```
src/server/repository/
├── base.ts                         # BaseIntRepository（整数主键）
├── agentRepository.ts
├── modelProviderRepository.ts
├── settingRepository.ts
├── transactionRepository.ts
└── chat/                           # 字符串主键（nanoid）的 Chat 相关 Repository
    ├── base.ts                     # BaseRepository（字符串主键）
    ├── session.ts
    ├── topic.ts
    ├── message.ts
    ├── thread.ts
    ├── file.ts
    ├── plugin.ts
    └── index.ts                    # barrel 导出
```

**规则：**
- 非 Chat 类 Repository 放在 `repository/` 根目录
- Chat 相关 Repository 放在 `repository/chat/` 子目录，并通过 `index.ts` 统一导出
- 新 Repository 文件命名：`xxxRepository.ts`（camelCase + 首字母小写）

---

## 3. 选择基类

| 场景 | 基类 | 主键类型 |
|------|------|----------|
| 普通业务表（自增主键） | `BaseIntRepository<T>` | `number` |
| Chat 相关表（nanoid 主键） | `BaseRepository<T>` | `string` |

```typescript
// ✅ 整数主键（如 settings、model_providers、transactions）
import { BaseIntRepository } from './base';
export class SettingRepository extends BaseIntRepository<Setting> { ... }

// ✅ 字符串主键（如 chat_sessions、chat_messages）
import { BaseRepository } from './base';
export class SessionRepository extends BaseRepository<ChatSession> { ... }
```

---

## 4. 实体类型定义

**优先使用 Drizzle 的类型推断：**

```typescript
// ✅ 推荐：直接从 schema 推断
export type AgentEntity = typeof agent.$inferSelect;
export type CreateAgentData = Omit<AgentEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAgentData = Partial<Omit<AgentEntity, 'id' | 'createdAt' | 'updatedAt'>>;

// ✅ 也可以：手动定义接口（适合有额外字段时）
export interface TransactionEntity {
  id: number;
  accountId: number;
  // ...
  createdAt: Date;
  updatedAt: Date;
}
```

实体类型必须包含 `id`、`createdAt`、`updatedAt` 字段，与基类泛型约束匹配。

---

## 5. 类和文件结构

### 5.1 标准单表 Repository

```typescript
/**
 * Xxx Repository
 *
 * 数据访问层：负责 xxx_table 表的数据库操作
 */
import { db } from '@server/lib/db';
import { xxxTable } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { BaseIntRepository } from './base';

export class XxxRepository extends BaseIntRepository<XxxEntity> {
  constructor() {
    super(xxxTable);
  }

  // 自定义查询方法...
}

// ✅ 必须在文件末尾导出单例
export const xxxRepository = new XxxRepository();
```

### 5.2 联合查询 Repository（跨表 JOIN）

当需要多表 JOIN 查询时，创建独立的 Combined Repository，不继承基类：

```typescript
export class XxxCombinedRepository {
  async findXxxWithRelation(userId: number): Promise<Result | null> {
    return db
      .select({ ... })
      .from(tableA)
      .innerJoin(tableB, eq(tableA.fk, tableB.id))
      .where(...);
  }
}

export const xxxCombinedRepository = new XxxCombinedRepository();
```

---

## 6. 方法命名规范

| 操作 | 命名模式 | 返回值 |
|------|----------|--------|
| 按主键查询 | `findById(id)` | `T \| null` |
| 按条件查单条 | `findOne(where)` | `T \| null` |
| 按条件查多条 | `findMany(where?, options?)` | `T[]` |
| 按字段查询 | `findBy{Field}(value)` | `T[]` |
| 按复合条件查询 | `findBy{Field1}And{Field2}(v1, v2)` | `T \| T[] \| null` |
| 查询全部 | `findAll(options?)` | `T[]` |
| 创建 | `create(data)` | `T` 或 `string`（id） |
| 更新 | `update(id, data)` | `T \| null` 或 `boolean` |
| 按条件更新 | `updateBy{Field}(field, data)` | `T \| null` |
| 创建或更新 | `upsert(...)` | `T` |
| 删除 | `delete(id)` | `boolean` |
| 按条件删除 | `deleteBy{Field}(value)` | `void` |
| 检查存在 | `exists{By...}(...)` | `boolean` |
| 统计数量 | `countBy{Field}(value)` | `number` |
| 验证归属 | `verifyOwnership(id, userId)` | `boolean` |
| 切换状态 | `toggle{Field}(id, value)` | `T \| null` |

---

## 7. 使用基类方法规范

### BaseIntRepository 可用方法（直接调用）

```typescript
this.create(data)                    // 创建，自动填充 createdAt/updatedAt
this.findById(id)                    // 按 id 查找
this.findOne(whereSQL)               // 按条件查单条
this.findMany(whereSQL?, options?)   // 按条件查多条
this.findAll(options?)               // 查询全部
this.update(id, data)               // 按 id 更新，自动填充 updatedAt
this.updateWhere(whereSQL, data)     // 按条件批量更新
this.delete(id)                      // 按 id 删除
this.deleteWhere(whereSQL)           // 按条件删除
this.deleteMany(ids[])               // 批量删除
this.count(whereSQL?)                // 计数
this.exists(whereSQL)                // 检查存在
```

### BaseRepository（Chat）可用方法（protected，需包装）

```typescript
this._create(data)                   // 创建（生成 nanoid）
this._findById(id)                   // 按 id 查找
this._update(id, data)               // 更新
this._delete(id)                     // 删除
this._deleteMany(ids[])              // 批量删除
this._findAll(options?)              // 查询
this._count(whereSQL?)               // 计数
this._exists(id)                     // 检查存在
```

> Chat Repository 的方法为 `protected`，子类需包装为 `public` 方法后对外暴露。

---

## 8. 直接使用 db 的场景

在以下场景可直接使用 `db`，而不依赖基类方法：

- 复杂 JOIN 查询（Combined Repository）
- 使用 `db.query.*`（Relational Query API）
- 聚合查询（SUM、AVG、GROUP BY）
- 特定的 upsert 逻辑

```typescript
// ✅ 复杂查询中直接使用 db
const result = await db
  .select({ id: providerModels.id })
  .from(providerModels)
  .innerJoin(modelProviders, eq(providerModels.providerId, modelProviders.id))
  .where(and(...));
```

---

## 9. Service 使用 Repository 规范

```typescript
// ✅ 正确：导入并使用单例
import { settingRepository } from '@server/repository/settingRepository';

export class SettingService {
  async getSetting(userId: number, key: string) {
    return settingRepository.findByUserIdAndKey(userId, key);
  }
}

// ❌ 错误：Service 中直接使用 db
import { db } from '@server/lib/db';
const result = await db.select().from(settings).where(...);
```

---

## 10. 单元测试规范

测试 Service 时，**mock Repository 单例**，而非底层数据库：

```typescript
// ✅ 正确：mock Repository
vi.mock('@server/repository/settingRepository');
import { settingRepository } from '@server/repository/settingRepository';
vi.mocked(settingRepository.findByUserIdAndKey).mockResolvedValue(mockSetting);

// ❌ 错误：mock 底层 db
vi.mock('@server/lib/db');
```

---

## 11. 注释规范

- 文件顶部：JSDoc 注释说明 Repository 职责和对应表名
- 方法注释：JSDoc 注释说明参数含义和返回值
- 复杂查询：行内注释解释查询意图

```typescript
/**
 * Setting Repository
 *
 * 数据访问层：负责 settings 表的数据库操作
 */

/**
 * 创建或更新设置（Upsert）
 * @param userId 用户 ID
 * @param key 设置键
 * @param value 设置值
 * @returns 创建或更新的设置
 */
async upsert(userId: number, key: string, value: string): Promise<Setting> { ... }
```

---

## 12. 禁止事项

- ❌ Service / Controller 中直接调用 `db`
- ❌ Repository 中包含业务逻辑（如权限校验、数据转换）
- ❌ Repository 方法间相互跨文件调用（Combined Repository 除外）
- ❌ 导出 Repository 类实例以外的 `db` 查询结果缓存
- ❌ 在 Repository 外部 `new XxxRepository()`（使用导出的单例）
