# 数据库功能概述

本文档概述了项目中添加的数据库功能。

## 功能列表

1. **SQLite 数据库集成**
   - 使用 SQLite 作为本地开发数据库
   - 通过 Drizzle ORM 进行数据库操作

2. **数据库表结构**
   - 用户账户表 (userAccounts)
   - 账户资金表 (accountFunds)
   - 股票持仓表 (stockPositions)
   - 交易记录表 (transactions)

3. **数据库连接管理**
   - 在 `src/lib/db.ts` 中创建和导出数据库连接实例
   - 使用单例模式避免重复连接

4. **API 路由示例**
   - 在 `src/app/api/example/route.ts` 中提供了完整的 CRUD 操作示例

5. **Server Component 示例**
   - 在 `src/app/(pages)/account/components/account-list.tsx`
     中展示了如何在页面组件中使用数据库

6. **数据库迁移工具**
   - 配置了 Drizzle Kit 用于数据库迁移和管理
   - 提供了生成迁移文件、执行迁移和启动 Drizzle Studio 的 npm 脚本

## 使用方法

### 1. 安装依赖

```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

### 2. 生成并执行迁移

```bash
npm run db:generate
npm run db:migrate
```

### 3. 启动 Drizzle Studio

```bash
npm run db:studio
```

## 数据库操作示例

### 查询数据

```typescript
import { db } from '@/lib/db';
import { userAccounts } from '@/drizzle/schema';

// 查询所有用户
const users = await db.select().from(userAccounts);

// 根据条件查询
const user = await db.select().from(userAccounts).where(eq(userAccounts.id, 1));
```

### 插入数据

```typescript
import { db } from '@/lib/db';
import { userAccounts } from '@/drizzle/schema';

// 插入单条记录
const [newUser] = await db
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

### 更新数据

```typescript
import { db } from '@/lib/db';
import { userAccounts } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

// 更新记录
const [updatedUser] = await db
  .update(userAccounts)
  .set({
    username: 'updateduser',
    updatedAt: new Date(),
  })
  .where(eq(userAccounts.id, 1))
  .returning();
```

### 删除数据

```typescript
import { db } from '@/lib/db';
import { userAccounts } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

// 删除记录
const [deletedUser] = await db
  .delete(userAccounts)
  .where(eq(userAccounts.id, 1))
  .returning();
```

## 注意事项

1. 数据库操作只能在服务器端执行（Server Components、Server Actions、API Routes）
2. 不要在客户端组件中直接访问数据库
3. 在生产环境中，建议使用更强大的数据库解决方案（如 PostgreSQL）
4. 确保在 `.gitignore` 文件中添加了数据库文件的忽略规则
