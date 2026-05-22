# Next.js 15 + SQLite + Drizzle ORM 开发规范

## 🧱 项目架构

- 数据库相关代码统一放在 `lib/db.ts` 和 `drizzle/` 目录中。
- Schema 定义在 `drizzle/schema.ts`。
- 数据库迁移使用 `drizzle-kit`，迁移文件存于 `drizzle/migrations/`。
- 所有数据库操作必须在 **Server Components、Server Actions 或 API Routes**
  中执行，**禁止在 Client Components 中直接访问数据库**。

## 🗄️ 数据库与 ORM

- 使用 **LibSQL**（通过 `@libsql/client` 驱动）作为数据库客户端，以确保在 Electron 和 Node.js 环境中的兼容性。
- 使用 **Drizzle ORM**，确保类型安全和简洁语法。
- 数据库连接管理统一通过 `src/server/lib/DatabaseManager.ts` 处理，它负责：
  - 区分开发环境和生产环境（Electron/Web）。
  - 在 Electron 生产环境中自动定位到用户数据目录（如 `~/.investment-agent`）。
  - 处理数据库迁移和初始化。
- 数据库实例通过 `src/server/lib/db.ts` 导出，使用 `DatabaseManager` 单例模式。
- 所有查询必须使用 Drizzle 的类型安全 API（如 `db.select().from(...)`）。
- 每个 schema 的 table 都必须包含 `id`、`created_at`、`updated_at` 字段。

## 📦 依赖与工具

- 必装依赖：
  ```bash
  npm install drizzle-orm @libsql/client
  npm install -D drizzle-kit
  ```
- `drizzle.config.ts` 配置为使用 `sqlite` 方言，输出路径为 `drizzle/migrations`。
- 数据库迁移命令：
  - `pnpm db:generate`：生成迁移文件。
  - `pnpm db:migrate`：应用迁移（在开发环境）。
  - 生产环境（Electron/Web）启动时会自动检查并应用迁移。

## 🔐 安全与性能

- 永远不要将数据库逻辑暴露给客户端。
- 在 Server Actions 中处理用户输入时，必须进行验证（推荐使用 Zod）。
- 利用 Next.js 的 **自动缓存** 和 **流式渲染** 优化数据加载。
- 对于频繁读取的数据，考虑使用 `fetch` 的缓存策略或 React 的 `use`（在 Server Components 中）。

## 🧪 开发体验

- 提供可直接运行的代码片段，包含完整 import 路径。
- 所有 TypeScript 代码必须包含明确的类型定义。
- 数据库 Schema 定义在 `drizzle/schema/` 目录下。
- 示例优先使用 **Server Component + async 数据获取** 模式。

## 📝 迁移脚本幂等性规范

迁移 SQL 脚本必须具备幂等性，确保在 rebase、分支切换或重复执行时不会因为对象已存在而报错。

### 规则

- `CREATE TABLE` 必须使用 `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX` / `CREATE UNIQUE INDEX` 必须使用 `IF NOT EXISTS`
- `DROP TABLE` / `DROP INDEX` 必须使用 `IF EXISTS`
- `drizzle-kit generate` 生成的迁移文件默认不包含 `IF NOT EXISTS`，需手动补充后再提交

### 原因

- `drizzle-kit push` 对带 WHERE 条件的 partial index 存在已知兼容问题，可能尝试重建已有索引导致 `already exists` 错误
- 多分支并行开发 rebase 后，迁移编号可能重排，本地数据库已包含部分迁移创建的对象
- 幂等性确保开发者无需删除本地数据库即可安全执行迁移

### 示例

```sql
-- ✅ 正确：幂等迁移
CREATE TABLE IF NOT EXISTS `my_table` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_my_table_name` ON `my_table` (`name`);

-- ❌ 错误：非幂等迁移（rebase 后可能失败）
CREATE TABLE `my_table` ( ... );
CREATE INDEX `idx_my_table_name` ON `my_table` (`name`);
```

## 🚫 禁止行为

- ❌ 在 Client Components 中直接导入 `src/server/lib/db.ts` 或执行数据库查询。
- ❌ 使用 `prisma`、`mongoose` 或其他 ORM。
- ❌ 直接操作 `.db` 文件或使用 `fs` 模块写入数据库文件（应通过 Drizzle 或 DatabaseManager）。
- ❌ 在 Electron 主进程中直接使用 `better-sqlite3`（应使用 `@libsql/client` 或 `DatabaseManager`）。
- ❌ 迁移脚本中使用不带 `IF NOT EXISTS` / `IF EXISTS` 的 DDL 语句。

## 💡 默认假设

- 项目使用 **TypeScript**。
- 数据库位于用户主目录下的 `.investment-agent/sqlite.db`（生产环境）或项目根目录（开发环境配置）。
- Next.js 版本为 **15+**。

请基于以上规则，生成安全、高效、符合 Next.js 15 最佳实践的代码。

````

---

### 🔧 配套建议（可选）

你可以在项目根目录添加以下文件以完善开发体验：

#### `drizzle.config.ts`
```ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  driver: 'sqlite',
  dbCredentials: {
    url: './sqlite.db',
  },
} satisfies Config;
````

#### `package.json` 脚本

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
  }
}
```

---
