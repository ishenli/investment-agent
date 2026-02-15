# database Spec Delta: Model Provider Tables

## ADDED Requirements

### Requirement: Model Providers Database Tables
系统 MUST 在数据库中添加 `model_providers` 和 `provider_models` 两个表，用于存储 AI 模型服务商的配置信息。

#### Scenario: model_providers 表结构
- **GIVEN** 数据库初始化或迁移
- **WHEN** 创建 `model_providers` 表
- **THEN** 表 MUST 包含以下字段：
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `account_id`: INTEGER NOT NULL，关联 accounts 表
  - `slug`: TEXT NOT NULL UNIQUE，服务商唯一标识（如 'openai', 'anthropic'）
  - `name`: TEXT NOT NULL，服务商显示名称（如 'OpenAI'）
  - `base_url`: TEXT NOT NULL，API 端点地址
  - `api_key`: TEXT，可选的 API 密钥
  - `is_active`: INTEGER NOT NULL DEFAULT 1，激活状态（0=未激活，1=激活）
  - `display_order`: INTEGER NOT NULL DEFAULT 0，显示排序
  - `description`: TEXT，服务商描述
  - `created_at`: INTEGER NOT NULL，创建时间戳
  - `updated_at`: INTEGER NOT NULL，更新时间戳
- **THEN** 表 MUST 在 `account_id` 上创建索引
- **THEN** 表 MUST 在 `slug` 上创建索引

#### Scenario: provider_models 表结构
- **GIVEN** 数据库初始化或迁移
- **WHEN** 创建 `provider_models` 表
- **THEN** 表 MUST 包含以下字段：
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `provider_id`: INTEGER NOT NULL，关联 model_providers 表
  - `slug`: TEXT NOT NULL，模型标识（如 'gpt-4', 'claude-3.5'）
  - `name`: TEXT NOT NULL，模型显示名称
  - `context_window`: INTEGER，上下文窗口大小（token 数）
  - `supports_vision`: INTEGER DEFAULT 0，是否支持视觉（0=不支持，1=支持）
  - `supports_function_calling`: INTEGER DEFAULT 0，是否支持函数调用（0=不支持，1=支持）
  - `is_active`: INTEGER NOT NULL DEFAULT 1，激活状态（0=未激活，1=激活）
  - `display_order`: INTEGER NOT NULL DEFAULT 0，显示排序
  - `created_at`: INTEGER NOT NULL，创建时间戳
  - `updated_at`: INTEGER NOT NULL，更新时间戳
- **THEN** 表 MUST 在 `provider_id` 上创建索引
- **THEN** 表 MUST 在 `slug` 上创建索引

#### Scenario: 外键关系和级联删除
- **GIVEN** `model_providers` 和 `provider_models` 表都已创建
- **WHEN** 删除一个 provider
- **THEN** 该 provider 关联的所有 models 必须（MUST）被级联删除
- **THEN** 外键关系 MUST 定义为 ON DELETE CASCADE

#### Scenario: 表命名和字段约定
- **GIVEN** 新建表
- **WHEN** 定义表结构
- **THEN** 表名和字段名 MUST 遵循 snake_case 命名约定
- **THEN** 时间戳字段 MUST 使用 `created_at` 和 `updated_at` 命名
- **THEN** 布尔值的整数字段 MUST 使用 `is_active` 或 `supports_*` 命名模式

---

## MODIFIED Requirements

None.

---

## RENAMED Requirements

None.

---

## REMOVED Requirements

None.

---

## Implementation Notes

### Drizzle Schema Definition

```typescript
// drizzle/schema.ts

export const modelProviders = sqliteTable('model_providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  apiKey: text('api_key'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const providerModels = sqliteTable('provider_models', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: integer('provider_id')
    .notNull()
    .references(() => modelProviders.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  contextWindow: integer('context_window'),
  supportsVision: integer('supports_vision', { mode: 'boolean' }).default(false),
  supportsFunctionCalling: integer('supports_function_calling', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

### Migration Command

```bash
pnpm db:generate  # Generate migration file
pnpm db:migrate   # Apply migration
```

### Backward Compatibility

- **No Breaking Changes**: New tables are added without modifying existing tables
- **Optional Migration**: Existing `settings` table remains for current configuration
- **Coexistence**: Both configuration methods can coexist during transition period