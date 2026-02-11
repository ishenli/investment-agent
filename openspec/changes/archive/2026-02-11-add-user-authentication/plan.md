# 实现计划：用户认证功能

**分支**：`add-user-authentication` | **日期**：2026-02-10 | **规范**：[link]
**输入**：来自 `/openspec/changes/add-user-authentication/specs/user-auth/spec.md` 的功能规范

## 概要

实现用户注册、登录和认证状态检查功能。用户通过用户名+密码完成注册，系统创建用户记录并返回 JWT Token 存储到 LocalStorage。首次使用时，系统检测数据库为空则直接显示注册表单，已有用户时显示登录表单。认证状态检查 API 用于前端初始化时验证用户登录状态。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, Drizzle ORM, Zod (验证), bcryptjs (密码哈希)
**数据库**：SQLite (LibSQL)
**存储**：LocalStorage (JWT Token)
**测试**：Vitest
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：登录/注册响应 < 1s，认证检查 < 300ms
**约束条件**：必须兼容 Electron，支持开发模式绕过认证

## 规范检查

- 检查是否符合 [项目规范](file://openspec/project.md)
- 检查 TypeScript 严格模式约束
- 检查 OpenSpec delta 格式正确性

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-user-authentication/
├── proposal.md                 # 变更提案
├── plan.md                     # 此文件
├── tasks.md                    # 任务清单
└── specs/
    └── user-auth/              # 新增 capability
        └── spec.md            # Delta 变更
```

### 源代码（项目根目录）

```text
src/
├── app/
│   ├── api/                    # API Routes
│   │   └── auth/               # 认证相关 API
│   │       ├── register/       # 注册 API
│   │       │   └── route.ts
│   │       ├── login/          # 登录 API
│   │       │   └── route.ts
│   │       └── check/          # 认证检查 API
│   │           └── route.ts
│   └── (pages)/
│       └── auth/               # 认证页面
│           ├── page.tsx        # 统一入口（自动切换）
│           ├── login/
│           │   └── page.tsx
│           └── register/
│               └── page.tsx
├── server/
│   ├── service/
│   │   └── authService.ts      # 增强：JWT Token 验证
│   ├── controller/
│   │   ├── authController.ts   # 新增认证控制器
│   │   └── userController.ts   # 新增用户控制器
│   ├── middleware/
│   │   └── authMiddleware.ts   # 新增/调整路由中间件
│   └── utils/
│       └── jwt.ts              # JWT 工具（已存在）
├── components/
│   ├── forms/
│   │   ├── LoginForm.tsx       # 登录表单组件
│   │   └── RegisterForm.tsx    # 注册表单组件
│   └── ui/                     # 现有 UI 组件
└── shared/
    └── types/
        └── auth.ts             # 认证相关类型
```

**结构决策**：认证相关代码集中在 `auth` 目录和 `authService`，路由遵循 Next.js App Router 规范，复用现有的 UI 组件。

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 作为新用户，我可以通过用户名+密码完成注册 | 访问 /auth 页面，填写信息后成功创建用户 |
| P1 | 作为已注册用户，我可以通过用户名+密码登录系统 | 访问 /auth/login 填写凭证后成功登录 |
| P1 | 系统能自动判断显示登录/注册表单 | 清空数据库访问 /auth 显示注册，有用户后显示登录 |
| P2 | 前端能检查当前认证状态 | 调用 /api/auth/check 返回正确的认证状态 |
| P2 | 登录/注册失败有友好的错误提示 | 输入错误凭证时显示清晰错误信息 |

## 技术架构

### 数据流

```
用户输入表单
    ↓
[Auth Page Component]
    ↓ POST
[auth/login 或 auth/register API]
    ↓
[AuthController] → [AuthService]
    ↓
[数据库查询/用户创建]
    ↓
[JWT Token 生成]
    ↓
返回 Token → [LocalStorage 存储]
```

### 认证检查流程

```
应用初始化
    ↓
[Auth Store - 检查 Token]
    ↓
GET /api/auth/check
    ↓
[AuthTokenMiddleware → AuthService]
    ↓
返回认证状态 + 用户信息
    ↓
更新 Auth Store 状态
    ↓
路由决策（有账户则跳转，无则引导创建）
```

### 状态管理

- **服务端**: 数据库 users 表存储用户凭证
- **客户端**: Zustand auth store 管理登录状态、用户信息
- **缓存策略**: LocalStorage 持久化 JWT Token

### 外部集成

- **JWT**: 使用现有的 `jwt` 工具实现 Token 生成和验证
- **密码哈希**: 使用 bcryptjs 进行密码哈希
- **数据库**: 使用 Drizzle ORM 操作 users 表

## 复杂性跟踪

| 违规 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 自定义统一入口页面 | 提供更流畅的用户体验，减少解用户认知负担 | 分离的登录/注册页面需要用户额外判断选择 |
| 前端认证状态检查 | 避免每次请求都验证 Token，提升性能 | 每次请求都验证 Token 会增加延迟 |
| 开发模式绕过 | 方便开发调试，不需要每次都注册登录 | 强制验证会拖慢开发速度 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| LocalStorage XSS 攻击 | 高 | Token 设置较短过期时间，敏感操作二次验证 |
| 密码哈希不当导致安全问题 | 高 | 使用 bcryptjs 标准库，设置足够 salt rounds |
| JWT Token 泄露 | 中 | 设置合理的过期时间，支持 Token 刷新 |
| 认证失败导致应用不可用 | 中 | 开发模式允许绕过认证，有清晰的错误提示 |

## 性能考虑

- 登录/注册 API 响应时间 < 1s
- 认证检查 API 响应时间 < 300ms
- Token 验证使用缓存避免重复数据库查询
- 登录状态检查仅在应用初始化时执行

## 安全考虑

- 密码使用 bcryptjs 哈希（salt rounds >= 10）
- JWT Token 包含过期时间（建议 7-30 天）
- 敏感操作需重新验证密码
- 登录失败次数限制（防止暴力破解）
- 注册表单验证确保密码强度

## 测试策略

- **单元测试**: AuthService 方法、Controller 方法、密码哈希/验证逻辑
- **集成测试**: API 端点（注册、登录、检查）、数据库操作
- **组件测试**: LoginForm、RegisterForm 组件