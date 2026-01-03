# 实现计划

## 概述

本计划描述如何实现首次登录时自动跳转到账户创建页面的功能，以及账户创建成功后的自动选择和跳转逻辑。

## 架构设计

### 组件层次结构

```
src/app/
├── layout.tsx                    # 根布局 - 添加应用添加应用初始化逻辑
├── (pages)/
│   ├── account/create/
│   │   └── page.tsx              # 账户创建页面
│   └── asset/
│       └── page.tsx              # 资产页面 - 需要添加路由守卫
├── hooks/
│   └── useAccountGuard.ts        # 新增：账户守卫 Hook
└── store/
    └── account/
        └── slices/
            └── create/
                └── action.ts     # 增强：添加自动选择和跳转逻辑
```

## Schema 变更

无需数据库 schema 变更，利用现有的账户管理表结构。

## API 端点使用

### 现有 API（复用）

1. `GET /api/account` - 获取账户列表
2. `POST /api/account/selected` - 设置选中账户
3. `POST /api/account/trading` - 创建新账户

### 无需新增 API

## 详细实现策略

### 1. 应用初始化账户检测

**位置**: `src/app/layout.tsx`

**实现方案**:
- 在根布局中添加客户端组件（或使用 `useEffect`）
- 应用挂载时调用 `initializeAccount` 进行账户状态检查
- 检查逻辑：
  1. 获取账户列表
  2. 获取当前选中账户
  3. 如果账户列表为空，重定向到 `/account/create`
  4. 如果账户列表不为空但未设置选中账户，自动选择第一个账户

**注意事项**:
- 使用客户端组件以确保可以访问路由
- 避免服务端渲染的重定向问题
- 添加 loading 状态以避免闪烁

### 2. 账户创建自动选择和跳转

**位置**: `src/app/store/account/slices/create/action.ts` 和 `src/app/(pages)/account/components/account-create.tsx`

**实现方案**:

#### Action 层
在 `createAccount` 函数中：
```typescript
createAccount: async (accountData) => {
  // ... 现有创建逻辑 ...

  // 创建成功后
  const newAccount = data.data;

  // 1. 自动设置为选中账户
  await setAccount(newAccount);

  // 2. 通知前端组件跳转
  return newAccount;
}
```

#### 组件层
在 `account-create.tsx` 中：
- 使用 `useEffect` 监听 `createdAccount` 状态变化
- 当检测到新账户创建成功时：
  1. 调用 `setAccount` 设置选中状态
  2. 使用 `router.push('/asset')` 跳转到资产页面
  3. 清空 `createdAccount` 状态

### 3. 页面访问限制

**位置**: 新建 `src/app/hooks/useAccountGuard.ts`

**实现方案**:
创建一个可复用的 Hook：
```typescript
export function useAccountGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { accounts, account, fetchAccounts, fetchSelectedAccount } = useAccountStore();

  useEffect(() => {
    const checkAccount = async () => {
      await fetchAccounts();

      // 需要保护的路由列表
      const protectedRoutes = ['/asset', '/chat', '/note', '/insight'];

      if (accounts.length === 0 && protectedRoutes.some(r => pathname.startsWith(r))) {
        router.push('/account/create');
        return;
      }

      if (!account && accounts.length > 0 && protectedRoutes.some(r => pathname.startsWith(r))) {
        await fetchSelectedAccount();
        if (!account) {
          setAccount(accounts[0]);
        }
      }
    };

    checkAccount();
  }, [pathname]);
}
```

**使用方式**:
在需要保护的页面中使用该 Hook：
```typescript
export default function AssetPage() {
  useAccountGuard();  // 添加守卫

  return <div>...</div>;
}
```

### 4. 路由白名单

定义不需要账户的路由白名单：
```
WHITELIST_ROUTES = [
  '/',
  '/account/create',
  '/help',           // 假设有帮助页面
  '/settings',       // 假设有设置页面不需要账户
]
```

## 实现依赖

### 前端依赖
- `next/navigation`: `useRouter`, `usePathname`, `redirect`
- `zustand`: 现有的账户状态管理
- `react`: `useEffect`, `useState`

### 服务端依赖
- 无新增依赖，复用现有 API

## 关键技术决策

### 1. 路由守卫实现方式
**决策**: 使用客户端 Hook 而非 Next.js Middleware
**理由**:
- 需要访问 Zustand store
- 需要更灵活的条件判断
- 可以处理特殊情况（如有账户但未选中）

### 2. 跳转时机
**决策**: 在账户创建 API 调用成功后立即跳转
**理由**:
- 用户体验更流畅
- 减少等待时间
- 避免用户手动操作

### 3. 状态管理
**决策**: 在 Zustand store 中管理账户列表和选中账户
**理由**:
- 现有架构已使用 Zustand
- 避免引入额外的状态管理复杂度
- 保持与现有代码的一致性

## 边缘情况处理

### 1. 网络错误
- 账户列表加载失败：显示错误提示，但仍允许访问公开页面
- 设置选中账户失败：在控制台记录错误，不阻断用户流程

### 2. 并发请求
- 如果用户快速点击创建按钮：使用防抖或禁用按钮状态

### 3. 深度链接访问
- 用户直接访问 `/asset/some-path`：重定向到 `/account/create`

### 4. 旧用户升级
- 已有账号但未设置选中：自动选择第一个账户（按创建时间排序）

## 测试策略

### 单元测试
- `useAccountGuard` Hook 的各种场景
- 账户创建流程的状态变化

### 集成测试
- 完整的首次登录流程
- 账户创建成功后的跳转

### E2E 测试
- 新用户首次访问应用的完整流程
- 已有用户正常访问的流程

## 部署考虑

### 向后兼容
- 已有账户的用户不受影响
- 系统会自动为用户设置选中账户（如果未设置）

### 回滚策略
- 如果出现问题，可以通过移除路由守卫来快速回滚
- 路由守卫是可选的，不影响核心功能