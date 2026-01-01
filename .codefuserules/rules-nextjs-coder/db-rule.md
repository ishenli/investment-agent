# Next.js 15 + SQLite + Drizzle ORM 开发规范

## 🧱 项目架构

- 数据库相关代码统一放在 `lib/db.ts` 和 `drizzle/` 目录中。
- Schema 定义在 `drizzle/schema.ts`。
- 数据库迁移使用 `drizzle-kit`，迁移文件存于 `drizzle/migrations/`。
- 所有数据库操作必须在 **Server Components、Server Actions 或 API Routes**
  中执行，**禁止在 Client Components 中直接访问数据库**。

## 🗄️ 数据库与 ORM

- 使用 **SQLite**（通过 `better-sqlite3` 驱动）作为本地开发数据库。
- 使用 **Drizzle ORM**（非 Prisma），确保类型安全和简洁语法。
- 数据库实例通过 `lib/db.ts` 导出，使用单例模式避免重复连接。
- 所有查询必须使用 Drizzle 的类型安全 API（如
  `db.select().from(...)`），避免原生 SQL 字符串（除非必要）。
- 每个 schema 的 table 都必须包含 `id`、`created_at`、`updated_at` 字段，且 `id` 必须是自增的，`created_at` 和 `updated_at` 必须是时间戳。

## 📦 依赖与工具

- 必装依赖：
  ```bash
  npm install drizzle-orm better-sqlite3
  npm install -D drizzle-kit @types/better-sqlite3
  ```
- `drizzle.config.ts` 必须配置为使用 `sqlite` 方言，输出路径为
  `drizzle/migrations`。
- 使用 `bun` 或 `node` 运行脚本，但代码需兼容 Node.js（因 Next.js 默认运行时）。

## 🔐 安全与性能

- 永远不要将数据库逻辑暴露给客户端。
- 在 Server Actions 中处理用户输入时，必须进行验证（推荐使用 Zod）。
- 利用 Next.js 的 **自动缓存** 和 **流式渲染** 优化数据加载。
- 对于频繁读取的数据，考虑使用 `fetch` 的缓存策略或 React 的 `use`（在 Server
  Components 中）。

## 🧪 开发体验

- 提供可直接运行的代码片段，包含完整 import 路径。
- 所有 TypeScript 代码必须包含明确的类型定义。
- 若涉及多个文件（如 schema、db、组件），请明确标注文件路径。
- 示例优先使用 **Server Component + async 数据获取** 模式，而非 useEffect + API
  Routes（除非需要客户端交互）。

## 🚫 禁止行为

- ❌ 在客户端组件中导入 `lib/db.ts` 或执行数据库查询。
- ❌ 使用 `prisma`、`mongoose` 或其他 ORM。
- ❌ 直接操作 `.db` 文件或使用 `fs` 模块写入数据库文件（应通过 Drizzle）。
- ❌ 在生产建议中推荐 SQLite（需说明：仅限本地开发，生产应迁移到 PostgreSQL）。

## 💡 默认假设

- 项目使用 **TypeScript**。
- 使用 **Tailwind CSS** 作为样式方案（如需样式）。
- 开发环境为本地（localhost），部署目标暂不考虑（但需备注生产限制）。
- Next.js 版本为 **15+（含 React Server Components、Actions 等特性）**。

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
