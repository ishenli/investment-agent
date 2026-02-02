# Next.js 应用测试规则 (Test Rules)

## 测试框架选择

本项目使用 **Vitest**
作为主要测试框架，替代原有的 Jest 配置。Vitest 提供了更快的执行速度和更好的 TypeScript 支持。

### 迁移原因

1. 更快的测试执行速度
2. 更好的 TypeScript 支持
3. 与 Vite 构建工具的无缝集成
4. 更简洁的配置

## 测试类型分类

### 1. 单元测试 (Unit Tests)

- 测试独立的函数、类或组件
- 不依赖外部系统（数据库、网络等）
- 使用模拟（mocks）和存根（stubs）替代外部依赖

### 2. 集成测试 (Integration Tests)

- 测试多个模块之间的交互
- 测试服务层与数据库的交互
- 测试 API 路由的完整流程

### 3. 组件测试 (Component Tests)

- 不需要编写相关的测试用例

### 4. 端到端测试 (E2E Tests)

- 不需要编写相关的测试用例

## 测试文件组织结构

- 编写对应源文件同目录的**tests**文件夹中，跟 vitest 的规范对齐

## 测试文件命名规范

1. 测试文件必须以 `.test.ts` 或 `.test.tsx` 结尾
2. 测试文件应与被测试文件位于相同目录下的 `__tests__` 文件夹中
3. 或者集中放在项目根目录的 `tests` 文件夹中按类型分类

## Vitest 配置规范

### 基础配置 (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: ['src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## 测试编写规范

### 1. 测试结构

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('模块名称', () => {
  beforeEach(() => {
    // 测试前的准备工作
  });

  it('应该正确执行某个功能', () => {
    // 测试逻辑
    expect(result).toBe(expected);
  });
});
```

### 2. Mock 规范

```typescript
// Mock 模块
vi.mock('fs-extra', () => ({
  writeJson: vi.fn(),
  readJson: vi.fn(),
  existsSync: vi.fn(),
}));

// Mock 环境变量
vi.mock('@/server/base/env', () => ({
  getProjectDir: () => '/mock/project/dir',
}));

// Mock 类实例方法
const mockService = {
  getData: vi.fn().mockResolvedValue({ id: 1, name: 'test' }),
};
```

### 3. 异步测试

```typescript
// Promise 测试
it('应该正确处理异步操作', async () => {
  const result = await service.getData();
  expect(result).toEqual({ id: 1, name: 'test' });
});

// 使用 resolves/rejects
it('应该正确处理异步操作', () => {
  expect(service.getData()).resolves.toEqual({ id: 1, name: 'test' });
});
```

## Next.js 特定测试规范

### 1. API 路由测试

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '@/app/api/stock/route';
import { StockController } from '@/app/api/stock/route';

describe('Stock API Routes', () => {
  it('应该正确处理 GET 请求', async () => {
    const request = new Request('http://localhost/api/stock');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
```

### 2. React 组件测试

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/(pages)/dashboard/page';

describe('DashboardPage', () => {
  it('应该正确渲染标题', () => {
    render(<DashboardPage />);
    expect(screen.getByText('账户分析')).toBeInTheDocument();
  });
});
```

### 3. 服务层测试

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountService } from '@/server/service/accountService';

describe('AccountService', () => {
  let accountService: AccountService;

  beforeEach(() => {
    accountService = new AccountService();
    vi.clearAllMocks();
  });

  it('应该正确创建账户', async () => {
    const request = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      initialDeposit: 1000,
      market: '美股',
      leverage: 1,
    };

    const result = await accountService.createAccount(request);

    expect(result.userAccount).toBeDefined();
    expect(result.userAccount.username).toBe('testuser');
  });
});
```

## 测试断言规范

### 1. 基本断言

```typescript
// 相等性断言
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toStrictEqual(expected);

// 真值断言
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();

// 数字断言
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);

// 字符串断言
expect(value).toMatch(/regex/);
expect(value).toContain('substring');
```

### 2. 异步断言

```typescript
// Promise 断言
await expect(asyncFunction()).resolves.toBe(expected);
await expect(asyncFunction()).rejects.toThrow();

// 异步完成断言
expect(mockFunction).toHaveBeenCalled();
expect(mockFunction).toHaveBeenCalledWith(arg1, arg2);
```

## 测试覆盖率要求

1. **核心业务逻辑** - 100% 覆盖率
2. **服务层代码** - 90% 以上覆盖率
3. **API 路由** - 85% 以上覆盖率
4. **UI 组件** - 80% 以上覆盖率

## 测试运行命令

```bash
# 运行所有测试
npm run test

# 运行特定文件测试
npm run test:file src/app/api/stock/__tests__/route.test.ts

# 运行监视模式
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage

# 运行特定测试套件
npm run test:unit
npm run test:integration
```

## 测试最佳实践

### 1. 测试可读性

- 使用描述性的测试名称
- 每个测试只验证一个功能点
- 保持测试独立，避免相互依赖

### 2. 测试维护性

- 避免测试实现细节
- 使用工厂函数创建测试数据
- 合理使用 beforeEach/afterEach

### 3. 测试性能

- 避免在测试中进行真实网络请求
- 使用快照测试谨慎
- 合理设置超时时间
