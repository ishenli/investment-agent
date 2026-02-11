# 添加用户认证（登录/注册）功能

## Why

当前系统缺少真实的用户认证功能，AuthService 使用硬编码的用户 ID '1' 进行开发。当数据库为空时，用户无法登录并返回 unauthorized 错误，需要引导用户完成注册流程。需要实现用户登录、注册功能，并能在账户状态检查失败时自动切换到注册页面。

## What Changes

### 新增功能

1. **用户注册功能**
   - 创建 `/auth/register` 页面，收集用户名和密码
   - 实现注册 API `/api/auth/register`，创建用户记录并返回 JWT Token
   - 注册成功后引导用户创建交易账户

2. **用户登录功能**
   - 创建 `/auth/login` 页面，支持用户名+密码登录
   - 实现登录 API `/api/auth/login`，验证凭证并返回 JWT Token
   - 利用 LocalStorage 存储 JWT Token

3. **统一入口页面**
   - 创建 `/auth` 页面，根据数据库状态自动切换登录/注册
   - 当用户表为空时，直接显示注册表单
   - 当有用户存在时，显示登录表单

4. **认证状态检查**
   - 实现认证检查 API `/api/auth/check`，验证用户登录状态
   - 前端在应用初始化时调用检查当前认证状态
   - 首次无用户时自动跳转到注册页面

5. **增强 AuthService**
   - 实现真实的 JWT Token 验证逻辑
   - 从 Headers/LocalStorage 读取 Token
   - 验证用户有效性

### 修改功能

1. **账户创建流程适配**
   - 现有的 `/account/create` 页面保持不变
   - 用户注册后引导到交易账户创建页面

## Impact

### 影响的 Specs

- **user-auth** (新增) - 用户认证相关规范
- **account-management** (修改) - 调整首次登录检测逻辑

### 影响的代码

- `src/server/service/authService.ts` - 增强 JWT Token 处理
- `src/middleware.ts` - 新增/调整路由中间件
- `src/app/api/auth/` - 新增认证相关 API 路由
- `src/app/(pages)/auth/` - 新增认证页面
- `src/components/forms/` - 新增登录/注册表单组件

### 破坏性变更

- AuthService.getCurrentUserId 从硬编码 '1' 改为真实 Token 验证
- 需要删除硬编码的测试用户 ID（或保留为开发模式选项）

### 兼容性影响

- 支持向后兼容：可通过环境变量控制是否启用真实认证（开发模式可绕过）