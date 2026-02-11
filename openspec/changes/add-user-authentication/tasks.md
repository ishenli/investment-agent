# 任务：用户认证功能

**输入**：来自 `/openspec/changes/add-user-authentication/specs/user-auth/spec.md` 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm types:check`
- 代码检查：`pnpm lint`
- 单元测试：`pnpm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 路径约定

| 类型 | 路径 |
|------|------|
| API Routes | `src/app/api/[capability]/route.ts` |
| Service | `src/server/service/[capability]Service.ts` |
| Controller | `src/server/controller/[biz]Controller.ts` |
| Store | `src/renderer/store/[capitalize]/store.ts` |
| Components | `src/components/[ComponentName]/` |
| Types | `src/shared/types/` |

## 第0阶段：准备（设计与验证）

- [x] T00 创建变更目录结构 `openspec/changes/add-user-authentication/` <!-- id: 0 -->
- [x] T01 编写 proposal.md 描述变更意图和影响 <!-- id: 1 -->
- [x] T02 编写 spec delta 规范变更 <!-- id: 2 -->
- [x] T03 运行 `openspec validate add-user-authentication --strict` 验证 <!-- id: 3 -->

---

## 第1阶段：设置（基础设施）

**目的**：项目初始化和类型定义

- [x] T004 在 `src/types/auth.ts` 中定义认证相关类型（AuthToken, User, AuthState 等） <!-- id: 4 -->
- [x] T005 安装 bcryptjs 依赖：`pnpm add bcryptjs` <!-- id: 5 -->
- [x] T006 在 `src/app/components/ui/` 中创建 PasswordInput.tsx <!-- id: 6 -->

---

## 第2阶段：基础（服务层）

**目的**：核心业务逻辑和数据访问，必须在 UI 前完成

**⚠️ 关键**：此阶段完成前不应开始 UI 工作

- [x] T007 [P] 增强 `src/server/service/authService.ts` 添加以下方法：
  - `hashPassword(password: string)` - 密码哈希
  - `verifyPassword(password: string, hash: string)` - 密码验证
  - `generateToken(user: UserType)` - 生成 JWT Token
  - `verifyToken(token: string)` - 验证 JWT Token
  - `registerUser(username: string, password: string)` - 用户注册
  - `loginUser(username: string, password: string)` - 用户登录
  - `checkAuthStatus(token: string)` - 检查认证状态 <!-- id: 7 -->
- [x] T008 [P] 在 `src/server/controller/authController.ts` 实现认证控制器 <!-- id: 8 -->
- [ ] T009 [P] 在 `src/server/controller/userController.ts` 实现用户控制器（用户查询等） <!-- id: 9 -->
- [ ] T010 编写 AuthService 方法单元测试 <!-- id: 10 -->

**检查点**：认证服务层就绪，可以开始 API/UI 实现

---

## 第3阶段：API

- [ ] T011 实现 `src/app/api/auth/register/route.ts` 注册 API <!-- id: 11 -->
- [ ] T012 添加注册请求验证（Zod schema） <!-- id: 12 -->
- [ ] T013 实现 `src/app/api/auth/login/route.ts` 登录 API <!-- id: 14 -->
- [ ] T014 添加登录请求验证（Zod schema） <!-- id: 15 -->
- [ ] T015 实现 `src/app/api/auth/check/route.ts` 认证检查 API <!-- id: 16 -->
- [ ] T016 添加错误处理和日志记录到所有认证 API <!-- id: 17 -->
- [ ] T017 编写 API 集成测试 <!-- id: 18 -->

---

## 第4阶段：User Story 1 - 用户注册功能 (优先级：P1) 🎯 MVP

**目标**：新用户可以通过用户名+密码完成注册
**独立测试**：访问 /auth 页面，填写用户名和密码后成功创建用户并收到 Token

### 实现

- [ ] T018 [P] [US1] 创建 `src/components/forms/RegisterForm.tsx` 注册表单组件 <!-- id: 19 -->
- [ ] T019 [P] [US1] 创建 `src/app/(pages)/auth/register/page.tsx` 注册页面 <!-- id: 20 -->
- [ ] T020 [US1] 添加注册表单验证（用户名长度、密码强度） <!-- id: 21 -->
- [ ] T021 [US1] 注册成功后存储 Token 到 LocalStorage <!-- id: 22 -->
- [ ] T022 [US1] 注册成功后跳转到账户创建页面（引导创建交易账户） <!-- id: 23 -->
- [ ] T023 [US1] 添加加载/错误状态处理 <!-- id: 24 -->
- [ ] T024 [US1] 编写组件单元测试 <!-- id: 25 -->

**检查点**：US1 功能完整可用

---

## 第5阶段：User Story 2 - 用户登录功能 (优先级：P1) 🎯 MVP

**目标**：已注册用户可以通过用户名+密码登录系统
**独立测试**：访问 /auth/login 填写凭证后成功登录并收到 Token

### 实现

- [ ] T025 [P] [US2] 创建 `src/components/forms/LoginForm.tsx` 登录表单组件 <!-- id: 26 -->
- [ ] T026 [P] [US2] 创建 `src/app/(pages)/auth/login/page.tsx` 登录页面 <!-- id: 27 -->
- [ ] T027 [US2] 实现登录表单验证（用户名、密码必填） <!-- id: 28 -->
- [ ] T028 [US2] 登录成功后存储 Token 到 LocalStorage <!-- id: 29 -->
- [ ] T029 [US2] 登录成功后跳转到资产页面（已有账户） <!-- id: 30 -->
- [ ] T030 [US2] 添加加载/错误状态处理 <!-- id: 31 -->
- [ ] T031 [US2] 编写组件单元测试 <!-- id: 32 -->

**检查点**：US2 功能完整可用

---

## 第6阶段：User Story 3 - 统一入口页面 (优先级：P1) 🎯 MVP

**目标**：系统根据数据库状态自动判断显示登录/注册表单
**独立测试**：清空数据库访问 /auth 显示注册，有用户后显示登录

### 实现

- [ ] T032 [P] [US3] 创建 `src/renderer/store/auth/store.ts` 认证状态管理 <!-- id: 33 -->
- [ ] T033 [US3] 在 `src/app/(pages)/auth/page.tsx` 创建统一入口页面 <!-- id: 34 -->
- [ ] T034 [US3] 实现用户存在性检查逻辑（调用 API） <!-- id: 35 -->
- [ ] T035 [US3] 根据检查结果动态渲染 LoginForm 或 RegisterForm <!-- id: 36 -->
- [ ] T036 [US3] 添加加载/错误状态处理 <!-- id: 37 -->
- [ ] T037 [US3] 编写组件单元测试 <!-- id: 38 -->

**检查点**：US3 功能完整可用

---

## 第7阶段：User Story 4 - 认证状态检查 (优先级：P2)

**目标**：前端能检查当前认证状态
**独立测试**：调用 /api/auth/check 返回正确的认证状态

### 实现

- [ ] T038 [P] [US4] 更新 `src/renderer/store/auth/store.ts` 添加认证检查方法 <!-- id: 39 -->
- [ ] T039 [US4] 在应用初始化组件中调用认证检查 <!-- id: 40 -->
- [ ] T040 [US4] 根据认证状态更新路由决策 <!-- id: 41 -->
- [ ] T041 [US4] 验证认证检查的响应式行为 <!-- id: 42 -->

---

## 第8阶段：User Story 5 - 错误处理增强 (优先级：P2)

**目标**：登录/注册失败有友好的错误提示
**独立测试**：输入错误凭证时显示清晰错误信息

### 实现

- [ ] T042 [US5] 统一错误消息国际化或中文本地化 <!-- id: 43 -->
- [ ] T043 [US5] 添加密码强度指示器 <!-- id: 44 -->
- [ ] T044 [US5] 添加登录失败次数限制提示 <!-- id: 45 -->
- [ ] T045 [US5] 验证所有错误场景的正确提示 <!-- id: 46 -->

---

## 第9阶段：完善与质量保证（可选）

**目的**：跨用户的改进和质量检查

- [ ] T046 运行 `pnpm lint` 并修复问题 <!-- id: 47 -->
- [ ] T047 运行 `pnpm types:check` 确保类型正确 <!-- id: 48 -->
- [ ] T048 运行 `pnpm test` 确保测试通过 <!-- id: 49 -->
- [ ] T049 添加开发模式环境变量控制（允许绕过认证） <!-- id: 50 -->
- [ ] T050 更新导航组件中的登录/登出按钮 <!-- id: 51 -->
- [ ] T051 性能优化审查（检查 API 响应时间） <!-- id: 52 -->
- [ ] T052 安全审查（密码哈希、Token 安全性） <!-- id: 53 -->

---

## 第10阶段：归档准备

- [ ] T053 更新所有 TODO 状态为完成 <!-- id: 54 -->
- [ ] T054 验证所有场景在 spec.md 中已实现 <!-- id: 55 -->

---

## 依赖关系

### 阶段依赖

- **准备（第0阶段）**：立即进行
- **设置（第1阶段）**：依赖准备完成
- **基础（第2阶段）**：依赖设置 - 阻塞 API/UI
- **API（第3阶段）**：依赖基础阶段
- **User Stories**：依赖 API 和基础阶段
- **完善**：依赖期望的 US 完成

### 并行机会

- LoginForm 与 RegisterForm 可以并行开发
- 注册 API 与登录 API 可以并行开发
- 认证 Store 可以与表单组件并行开发
- 各个表单组件可以并行构建

### 任务并行标记说明

- T018, T019 可以并行（注册表单与页面）
- T025, T026 可以并行（登录表单与页面）
- T032, T033 可以并行（Store 与页面）

---

## 任务 ID 汇总

| ID | 描述 | P阶段 |
|----|------|-------|
| T00-T03 | 准备阶段 | 0 |
| T04-T06 | 设置阶段 | 1 |
| T07-T10 | 基础/服务层 | 2 |
| T11-T17 | API 层 | 3 |
| T18-T24 | US1 - 用户注册 | 4 |
| T25-T31 | US2 - 用户登录 | 5 |
| T32-T38 | US3 - 统一入口 | 6 |
| T39-T41 | US4 - 认证检查 | 7 |
| T42-T46 | US5 - 错误处理 | 8 |
| T47-T53 | 完善与质量保证 | 9 |
| T54-T55 | 归档准备 | 10 |