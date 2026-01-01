# 数据库功能总结

本文档总结了项目中添加的所有数据库相关功能和文件。

## 新增文件

### 配置文件

1. `drizzle.config.ts` - Drizzle ORM 配置文件
2. `docs/database-setup.md` - 数据库设置指南
3. `docs/database-features.md` - 数据库功能概述
4. `docs/migrating-to-database.md` - 迁移到数据库指南

### 数据库相关文件

1. `drizzle/schema.ts` - 数据库表结构定义
2. `src/lib/db.ts` - 数据库连接管理
3. `src/app/api/example/route.ts` - 数据库操作 API 示例
4. `src/app/(pages)/account/components/account-list.tsx` - 数据库查询页面组件
5. `scripts/test-db.ts` - 数据库测试脚本
6. `src/app/api/example/__tests__/route.test.ts` - API 路由测试文件

## 数据库表结构

1. **userAccounts** - 用户账户表
   - id: 整数主键
   - username: 用户名（唯一）
   - email: 邮箱（唯一）
   - passwordHash: 密码哈希
   - createdAt: 创建时间
   - updatedAt: 更新时间

2. **accountFunds** - 账户资金表
   - id: 整数主键
   - accountId: 外键，关联 userAccounts 表
   - amount: 金额
   - currency: 货币类型
   - createdAt: 创建时间
   - updatedAt: 更新时间

3. **stockPositions** - 股票持仓表
   - id: 整数主键
   - accountId: 外键，关联 userAccounts 表
   - symbol: 股票代码
   - quantity: 持仓数量
   - averagePrice: 平均价格
   - createdAt: 创建时间
   - updatedAt: 更新时间

4. **transactions** - 交易记录表
   - id: 整数主键
   - accountId: 外键，关联 userAccounts 表
   - type: 交易类型（buy/sell）
   - symbol: 股票代码
   - quantity: 交易数量
   - price: 交易价格
   - totalAmount: 总金额
   - timestamp: 交易时间

## 使用示例

### API 路由中使用数据库

```typescript
import { db } from '@/lib/db';
import { userAccounts } from '@/drizzle/schema';

// 查询所有用户
const users = await db.select().from(userAccounts);

// 创建新用户
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

### Server Component 中使用数据库

```typescript
import { db } from '@/lib/db';
import { userAccounts } from '@/drizzle/schema';

export default async function AccountList() {
  // 获取所有用户账户
  const accounts = await db.select().from(userAccounts);
  // 渲染组件...
}
```

## 下一步建议

1. **安装依赖**：运行
   `npm install drizzle-orm better-sqlite3 --legacy-peer-deps` 安装生产依赖
2. **安装开发依赖**：运行
   `npm install -D drizzle-kit @types/better-sqlite3 --legacy-peer-deps`
   安装开发依赖
3. **生成迁移文件**：运行 `npm run db:generate` 生成数据库迁移文件
4. **执行迁移**：运行 `npm run db:migrate` 创建数据库表
5. **测试功能**：启动开发服务器并访问账户页面，查看数据库查询结果
6. **迁移现有数据**：参考 `docs/migrating-to-database.md`
   将现有文件数据迁移到数据库

## 注意事项

1. 数据库操作只能在服务器端执行（Server Components、Server Actions、API Routes）
2. 不要在客户端组件中直接访问数据库
3. 在生产环境中，建议使用更强大的数据库解决方案（如 PostgreSQL）
4. 确保在 `.gitignore` 文件中添加了数据库文件的忽略规则
