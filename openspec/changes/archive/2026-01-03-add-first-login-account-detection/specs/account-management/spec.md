# account-management Specification

## Purpose
管理用户交易账户的创建、选择和初始化流程。

## ADDED Requirements

### Requirement: First Login Detection
系统 MUST 在用户首次登录或应用初始化时，检测用户是否有交易账户。如果用户没有任何账户，则系统 MUST 自动跳转到账户创建页面。

#### Scenario: 首次登录时无账户检测
- **GIVEN** 用户首次登录或刷新应用
- **WHEN** 应用初始化并检查用户的账户列表
- **THEN** 如果用户没有任何交易账户，系统必须（MUST）自动重定向到 `/account/create` 页面

#### Scenario: 已有账户的用户正常访问
- **GIVEN** 用户已经有一个或多个交易账户
- **WHEN** 应用初始化并检查账户列表
- **THEN** 系统必须（MUST）允许用户正常访问应用的主页面
- **THEN** 如果用户有账户但未设置选中账号，系统必须（MUST）自动选择第一个账户

#### Scenario: 账户状态检查性能要求
- **WHEN** 系统执行账户状态检查
- **THEN** 系统必须在 500ms 内完成检查
- **THEN** 系统必须允许用户访问基础页面（如首页），即使检测失败

### Requirement: Account Creation Auto-Select
系统 MUST 在用户成功创建新账户后，自动将该账户设置为当前选中账户。

#### Scenario: 新账户自动设为选中状态
- **GIVEN** 用户在 `/account/create` 页面创建新账户
- **WHEN** 账户创建 API 调用成功返回
- **THEN** 系统 MUST 自动调用 `/api/account/selected` API 设置新账户为选中账户
- **THEN** 系统 MUST 将新账户 ID 保存到 sessionStorage

#### Scenario: 多账户场景下的账户选择
- **GIVEN** 用户已有一个账户 A
- **WHEN** 用户创建第二个账户 B
- **THEN** 系统 MUST 将账户 B 设置为当前选中账户

#### Scenario: 账户选择失败处理
- **WHEN** 新账户创建成功但设置选中账户的 API 调用失败
- **THEN** 系统 MUST 在控制台记录错误
- **THEN** 系统 MUST 仍能让用户正常使用系统，可以在账户列表中手动选择账户

### Requirement: Post-Creation Navigation
系统 MUST 在新账户创建成功后，自动跳转到资产页面。

#### Scenario: 创建成功后跳转到资产页面
- **GIVEN** 用户在 `/account/create` 页面成功创建新账户
- **WHEN** 账户创建和选中状态设置都完成
- **THEN** 系统 MUST 使用 Next.js 的 `router.push()` 跳转到 `/asset` 页面
- **THEN** 系统 MUST 在 300ms 内完成跳转，避免用户感知延迟

#### Scenario: 跳转失败处理
- **WHEN** 跳转到 `/asset` 页面失败
- **THEN** 系统 SHOULD 显示友好的错误提示
- **THEN** 系统 MUST 提供"手动跳转"按钮供用户点击

### Requirement: Page Access Restriction
系统 MUST 在用户没有账户时，限制用户只能访问账户创建页面。

#### Scenario: 无账户时阻止访问资产页面
- **GIVEN** 用户没有任何交易账户
- **WHEN** 用户尝试访问 `/asset` 页面
- **THEN** 系统 MUST 重定向到 `/account/create` 页面
- **THEN** 系统 MUST 显示提示消息："请先创建交易账户"

#### Scenario: 无账户时阻止访问其他需要账户的页面
- **GIVEN** 用户没有任何交易账户
- **WHEN** 用户尝试访问 `/chat`, `/note`, `/insight` 等需要账户数据的页面
- **THEN** 系统 MUST 重定向到 `/account/create` 页面

#### Scenario: 允许访问公开页面
- **GIVEN** 用户没有任何交易账户
- **WHEN** 用户访问首页 `/` 或帮助文档等公开页面
- **THEN** 系统 MUST 允许用户正常访问

### Requirement: Account List Initialization
系统 MUST 在应用启动时初始化账户列表和选中的账户。

#### Scenario: 加载账户列表
- **GIVEN** 应用初始化
- **WHEN** 系统加载账户商店状态
- **THEN** 系统 MUST 调用 `/api/account` 获取账户列表
- **THEN** 系统 MUST 在加载失败时显示错误提示

#### Scenario: 加载选中账户
- **GIVEN** 应用初始化
- **WHEN** 系统加载账户商店状态
- **THEN** 系统 MUST 调用 `/api/account/selected` 获取当前选中的账户
- **THEN** 如果返回 null 或 404，系统 SHOULD 检查账户列表
- **THEN** 如果账户列表不为空，系统 SHOULD 自动选择第一个账户