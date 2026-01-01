# 数据库设置指南

本项目使用 SQLite 和 Drizzle
ORM 作为数据库解决方案。以下是设置和使用数据库的指南。

## 安装依赖

在项目根目录下运行以下命令安装必要的依赖：

```bash
npm install drizzle-orm better-sqlite3 --legacy-peer-deps
npm install -D drizzle-kit @types/better-sqlite3 --legacy-peer-deps
```

或者使用 pnpm:

```bash
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit @types/better-sqlite3
```

## 数据库配置

数据库配置文件位于项目根目录的 `drizzle.config.ts` 文件中。

## 数据库 Schema

数据库表结构定义在 `drizzle/schema.ts` 文件中，包括以下表：

- `userAccounts`: 用户账户表
- `accountFunds`: 账户资金表
- `stockPositions`: 股票持仓表
- `transactions`: 交易记录表

## 数据库连接

数据库连接实例在 `src/lib/db.ts` 文件中创建和导出。

## 数据库迁移

### 生成迁移文件

运行以下命令生成数据库迁移文件：

```bash
npm run db:generate
```

### 执行迁移

运行以下命令执行数据库迁移：

```bash
npm run db:migrate
```

### 启动 Drizzle Studio

运行以下命令启动 Drizzle Studio 以可视化管理数据库：

```bash
npm run db:studio
```

## 使用数据库

在 Server Components、Server Actions 或 API Routes 中使用数据库：

```typescript
import { db } from '@/lib/db';
import { userAccounts } from '@/drizzle/schema';

// 查询用户账户
const accounts = await db.select().from(userAccounts);

// 创建新账户
const newAccount = await db
  .insert(userAccounts)
  .values({
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  .returning();
```

## 注意事项

1. 数据库操作只能在服务器端执行，不能在客户端组件中直接访问数据库。
2. 在生产环境中，建议使用更强大的数据库解决方案，如 PostgreSQL。
3. 请确保在 `.gitignore` 文件中添加 `*.db`
   条目，避免将数据库文件提交到版本控制系统中。
