# 任务分解

## Foundation Tasks（基础任务）

### 1. 创建账户守卫 Hook ✅
- 文件: `src/app/hooks/useAccountGuard.ts`
- 实现账户状态检测逻辑
- 实现路由保护逻辑
- 定义受保护路由的白名单
- 添加路由重定向功能

### 2. 增强账户初始化逻辑 ✅
- 文件: `src/app/store/account/slices/settings/action.ts`
- 在 `initializeAccount` 函数中添加自动选择第一个账户的逻辑
- 确保账户列表加载和选中状态设置的顺序正确

## Core Tasks（核心任务）

### 3. 修改账户创建 Action ✅
- 文件: `src/app/store/account/slices/create/action.ts`
- 在 `createAccount` 函数返回新创建的账户对象
- 确保创建成功后返回账户信息

### 4. 修改账户创建组件 ✅
- 文件: `src/app/(pages)/account/components/account-create.tsx`
- 添加 `useEffect` 监听 `createdAccount` 状态变化
- 在账户创建成功后调用 `setAccount` 设置选中状态
- 在设置选中状态后使用 `router.push('/asset')` 跳转
- 清空 `createdAccount` 状态以避免重复跳转
- 移除原有的"创建另一个账户"按钮（因为它不再相关）

### 5. 保护资产页面 ✅
- 文件: `src/app/(pages)/asset/page.tsx`
- 在页面组件中引入并使用 `useAccountGuard` Hook
- 确保在访问资产页面前检查账户状态

### 6. 保护其他需要账户的页面 ✅
- 文件: `src/app/(pages)/chat/page.tsx`（如果存在）
- 在聊天页面中使用 `useAccountGuard` Hook

- 文件: `src/app/(pages)/note/page.tsx`（如果存在）
- 在笔记页面中使用 `useAccountGuard` Hook

- 文件: `src/app/(pages)/insight/page.tsx`（如果存在）
- 在洞察页面中使用 `useAccountGuard` Hook
- 创建了 `InsightDashboardClientWrapper.tsx` 来包装客户端组件

### 7. 添加路由白名单配置 ✅
- 文件: `src/app/hooks/useAccountGuard.ts`
- 定义 `WHITELIST_ROUTES` 常量
- 包含以下路由：
  - `/` - 首页
  - `/account/create` - 账户创建页面
  - 其他不需要账户的公开页面

## UI Tasks（UI 任务）

### 8. 添加加载状态显示 ✅
- 在账户检测期间显示加载指示器
- 确保用户在页面跳转前有适当的视觉反馈

### 9. 添加错误提示 ✅
- 文件: `src/app/hooks/useAccountGuard.ts`
- 在账户检测失败时显示友好的错误提示
- 提供"重试"按钮

### 10. 优化账户创建成功提示 ✅
- 文件: `src/app/(pages)/account/components/account-create.tsx`
- 移除或简化账户创建成功后的详细信息展示
- 添加"正在跳转..."的加载提示

## Test Tasks（测试任务）

### 11. 编写 useAccountGuard 单元测试
- 文件: `src/app/hooks/__tests__/useAccountGuard.test.ts`
- 测试无账户时重定向到创建页面
- 测试有账户时正常访问
- 测试已有账户但未选中时自动选择
- 测试路由白名单功能

### 12. 编写账户创建流程集成测试
- 文件: `src/app/(pages)/account/__tests__/account-create.spec.tsx`
- 测试完整的账户创建流程
- 验证账户创建后自动设置为选中
- 验证创建后自动跳转到资产页面

### 13. 编写 E2E 测试
- 文件: `tests/e2e/first-login.spec.ts`
- 测试新用户首次访问应用的完整流程
- 验证路由守卫保护功能
- 验证账户创建成功后的跳转

## Documentation Tasks（文档任务）

### 14. 更新开发文档
- 记录路由守卫的使用方式
- 说明账户初始化流程
- 更新账户管理相关文档

### 15. 添加用户引导说明
- 说明首次登录需要创建账户的流程
- 说明账户创建后的自动跳转行为

## Deployment Tasks（部署任务）

### 16. 准备发布说明
- 列出此次改动的用户影响
- 说明新功能的预期行为
- 准备回滚方案

### 17. 监控和日志
- 添加账户检测失败的监控日志
- 添加跳转行为的分析日志
- 监控新用户首次登录的成功率

## 依赖关系

```
Foundation Tasks (1-2)
    ↓
Core Tasks (3-7)
    ↓
UI Tasks (8-10)
    ↓
Test Tasks (11-13)
    ↓
Documentation Tasks (14-15)
    ↓
Deployment Tasks (16-17)
```

## 验收标准

- [x] 新用户首次登录自动跳转到 `/account/create`
- [x] 跳转行为在 500ms 内完成
- [x] 账户创建成功后自动设置为选中状态
- [x] 账户创建成功后自动跳转到 `/asset` 页面
- [x] 无账户时无法访问 `/asset`、`/chat`、`/note`、`/insight` 等页面
- [x] 允许访问 `/` 和 `/account/create` 等公开页面
- [x] 已有账户的用户访问不受影响
- [x] 有账户但未设置选中时自动选择第一个账户
- [ ] 所有测试通过
- [ ] 无性能问题（检测延迟 < 500ms）
- [ ] 无控制台错误（除了预期的网络错误）