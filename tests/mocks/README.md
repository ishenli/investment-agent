# 测试 Mock 工具

本目录包含共享的测试 mock 工厂函数，用于减少测试代码中的重复。

## 使用说明

### setup.ts (全局 mock)

`tests/setup.ts` 中的 mock 会在所有测试运行前自动执行，用于全局 mock：

- `@/drizzle/schema` - Drizzle schema tables
- `drizzle-orm` - drizzle-orm 的 eq, and, sql, desc 函数
- `@server/base/logger` - Logger 对象

**注意**：这些 mock 已经全局生效，无需在测试文件中重复声明。

### test 文件中使用

#### 1. 使用 dbMock 工厂

```typescript
import { vi } from 'vitest';
import { mockDb } from '@/tests/mocks';

// Mock db，指定需要的 tables
vi.mock('@server/lib/db', () => mockDb(['users', 'accounts', 'userSelectedAccounts']));

// 或使用默认所有 tables
vi.mock('@server/lib/db', () => mockDb());

import { db } from '@server/lib/db';

// 在测试中使用
beforeEach(() => {
  vi.clearAllMocks();
});

it('should work', async () => {
  (db.query.users.findFirst as any).mockResolvedValue(mockUser);
  const result = await service.doSomething();
  expect(result).toBe('expected');
});
```

#### 2. 使用 loggerMock 工厂

**注意**：由于 logger 已在 setup.ts 中全局 mock，通常不需要在测试文件中重复 mock。

如果确实需要在特定测试中 overwrite logger mock：

```typescript
import { vi } from 'vitest';
import { mockLogger } from '@/tests/mocks';

vi.mock('@server/base/logger', () => mockLogger());
```

## API 参考

### mockDb(tables?)

创建 `@server/lib/db` 模块的 mock 对象。

**参数**：
- `tables` (可选): 需要包含的 query 表名称数组
  - 默认值: `['users', 'accounts', 'accountFunds', 'transactions', 'positions', 'stocks', 'userSelectedAccounts']`

**返回**：
```typescript
{
  db: {
    query: Record<string, { findFirst, findMany, insert }>,
    select,
    insert,
    update,
    delete,
    transaction,
    execute
  }
}
```

### createLoggerMock()

创建 logger mock 对象。

**返回**：
```typescript
{
  error: ViFunction,
  info: ViFunction,
  warn: ViFunction,
  debug: ViFunction
}
```

## 最佳实践

1. **优先使用 setup.ts 的全局 mock**：logger 和 drizzle-orm 已全局 mock
2. **按需声明 db tables**：只 mock 测试中实际用到的 tables
3. **在 beforeEach 中清理 mock**：使用 `vi.clearAllMocks()` 确保 mock 状态重置
4. **使用 as any 指定 mock 类型**：`(db.query.users.findFirst as any).mockResolvedValue(...)`