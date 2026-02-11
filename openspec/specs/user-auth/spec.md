# user-auth Specification

## Purpose
TBD - created by archiving change add-user-authentication. Update Purpose after archive.
## Requirements
### Requirement: User Registration
系统 MUST 支持用户通过用户名和密码完成注册。

#### Scenario: 成功注册新用户
- **GIVEN** 数据库中没有注册用户
- **WHEN** 用户访问统一认证页面并输入用户名（3-30字符）和密码（至少6字符）
- **THEN** 系统 MUST 创建用户记录，密码使用 bcryptjs 哈希存储
- **THEN** 系统 MUST 生成 JWT Token 并返回给客户端
- **THEN** 系统 MUST 将 Token 存储到 LocalStorage
- **THEN** 系统 MUST 自动跳转到交易账户创建页面 `/account/create`

#### Scenario: 注册时用户名已存在
- **GIVEN** 数据库中已存在用户名为 "testuser" 的用户
- **WHEN** 用户尝试使用相同的用户名注册
- **THEN** 系统 MUST 返回 409 错误
- **THEN** 系统 MUST 显示错误提示 "用户名已存在"

#### Scenario: 注册表单验证
- **GIVEN** 用户在注册页面
- **WHEN** 用户名少于 3 个字符
- **THEN** 系统 MUST 显示验证错误 "用户名长度应在3-30个字符之间"
- **WHEN** 密码少于 6 个字符
- **THEN** 系统 MUST 显示验证错误 "密码至少需要6个字符"
- **WHEN** 用户名包含非法字符
- **THEN** 系统 MUST 显示验证错误 "用户名只能包含字母、数字和下划线"

### Requirement: User Login
系统 MUST 支持已注册用户通过用户名和密码登录。

#### Scenario: 登录成功
- **GIVEN** 数据库中存在用户名为 "testuser" 的用户
- **WHEN** 用户输入正确的用户名和密码
- **THEN** 系统 MUST 验证密码哈希匹配
- **THEN** 系统 MUST 生成新的 JWT Token 并返回给客户端
- **THEN** 系统 MUST 将 Token 存储到 LocalStorage
- **THEN** 系统 MUST 检查用户是否有交易账户：有账户则跳转到 `/asset`，无账户则跳转到 `/account/create`

#### Scenario: 登录失败 - 用户名不存在
- **GIVEN** 数据库中不存在用户名为 "nonexistent" 的用户
- **WHEN** 用户尝试登录
- **THEN** 系统 MUST 返回 401 错误
- **THEN** 系统 MUST 显示模糊错误提示 "用户名或密码错误"（避免用户名枚举攻击）

#### Scenario: 登录失败 - 密码错误
- **GIVEN** 数据库中存在用户，但密码不正确
- **WHEN** 用户尝试登录
- **THEN** 系统 MUST 返回 401 错误
- **THEN** 系统 MUST 显示模糊错误提示 "用户名或密码错误"

#### Scenario: 登录多次失败
- **GIVEN** 用户连续 5 次登录失败
- **WHEN** 用户再次尝试登录
- **THEN** 系统 SHOULD 暂时锁定账户或显示验证码
- **THEN** 系统 MUST 显示提示 "登录失败次数过多，请稍后再试"

### Requirement: Unified Auth Entry
系统 MUST 提供统一认证入口，根据数据库状态自动切换登录/注册表单。

#### Scenario: 无用户时显示注册表单
- **GIVEN** 数据库中没有任何用户记录
- **WHEN** 用户访问 `/auth` 页面
- **THEN** 系统 MUST 自动显示注册表单
- **THEN** 系统 MUST 不显示"已有账号？去登录"链接
- **THEN** 页面标题 MUST 显示 "创建您的账户"

#### Scenario: 有用户时显示登录表单
- **GIVEN** 数据库中存在至少一个用户
- **WHEN** 用户访问 `/auth` 页面
- **THEN** 系统 MUST 自动显示登录表单
- **THEN** 系统 MUST 显示"没有账号？去注册"链接
- **THEN** 页面标题 MUST 显示 "欢迎回来"

#### Scenario: 用户存在性检查失败
- **WHEN** 系统 API 调用用户存在性检查失败
- **THEN** 系统 SHOULD 默认显示登录表单
- **THEN** 系统 MUST 显示轻量级错误提示

### Requirement: Auth Status Check
系统 MUST 提供认证状态检查 API，用于前端初始化时验证用户登录状态。

#### Scenario: Token 有效时的认证检查
- **GIVEN** LocalStorage 中存储了有效的 JWT Token
- **WHEN** 前端调用 `GET /api/auth/check`
- **THEN** 系统 MUST 验证 Token 有效性
- **THEN** 系统 MUST 返回用户基本信息（id, username）
- **THEN** 系统 MUST 返回认证状态为已认证
- **THEN** 响应时间 MUST 小于 300ms

#### Scenario: Token 无效或过期时的认证检查
- **GIVEN** LocalStorage 中的 Token 已过期或无效
- **WHEN** 前端调用 `GET /api/auth/check`
- **THEN** 系统 MUST 返回认证状态为未认证
- **THEN** 系统 MUST 清除 LocalStorage 中的无效 Token

#### Scenario: 无 Token 时的认证检查
- **GIVEN** LocalStorage 中没有 JWT Token
- **WHEN** 前端调用 `GET /api/auth/check`
- **THEN** 系统 MUST 返回认证状态为未认证
- **THEN** 系统 MUST 返回 null 用户信息

### Requirement: JWT Token Management
系统 MUST 使用 JWT 进行身份认证，Token 存储在 LocalStorage。

#### Scenario: Token 生成
- **GIVEN** 用户成功登录或注册
- **WHEN** 系统 Token 生成逻辑执行
- **THEN** Token MUST 包含用户 ID 和用户名
- **THEN** Token MUST 设置过期时间（7-30天）
- **THEN** Token MUST 使用签名密钥进行签名

#### Scenario: Token 验证
- **GIVEN** 请求带有 Authorization Header 或 LocalStorage Token
- **WHEN** 系统 Token 验证逻辑执行
- **THEN** 系统 MUST 验证 Token 签名
- **THEN** 系统 MUST 验证 Token 未过期
- **THEN** 系统 MUST 从 Token 中提取用户信息

#### Scenario: Token 存储策略
- **WHEN** 用户成功认证
- **THEN** Token MUST 存储到 LocalStorage 键名为 `auth_token`
- **THEN** Token MUST 易于读取和删除
- **WHEN** 用户登出
- **THEN** LocalStorage 中的 Token MUST 被删除

### Requirement: Password Security
系统 MUST 使用安全的密码存储和验证方式。

#### Scenario: 密码哈希存储
- **GIVEN** 用户输入明文密码
- **WHEN** 系统执行用户注册或密码修改
- **THEN** 密码 MUST 使用 bcryptjs 进行哈希
- **THEN** Salt rounds MUST 至少为 10
- **THEN** 数据库中只能存储哈希值，不能存储明文密码

#### Scenario: 密码验证
- **GIVEN** 用户输入登录密码
- **WHEN** 系统验证用户身份
- **THEN** 系统 MUST 使用 bcryptjs 验证密码哈希
- **THEN** 验证时间 MUST 足够慢以防止暴力破解

#### Scenario: 密码强度提示
- **GIVEN** 用户在注册页面
- **WHEN** 用户输入密码
- **THEN** 系统 MUST 实时显示密码强度指示（弱/中/强）
- **THEN** 系统 MUST 提供改进建议（添加数字、特殊字符等）

### Requirement: Post-Registration Redirect
注册成功后，系统 MUST 引导用户创建交易账户。

#### Scenario: 注册后跳转到账户创建
- **GIVEN** 用户成功完成注册
- **WHEN** Token 已存储到 LocalStorage
- **THEN** 系统 MUST 自动跳转到 `/account/create` 页面
- **THEN** 系统 MUST 在 500ms 内完成跳转
- **THEN** 账户创建页面 MUST 能够访问当前用户信息

#### Scenario: 注册后用户已有交易账户
- **GIVEN** 用户成功完成注册
- **WHEN** 系统检测到该用户已有交易账户
- **THEN** 系统 SHOULD 直接跳转到 `/asset` 页面
- **THEN** 系统 MUST 设置第一个交易账户为选中账户

### Requirement: Post-Login Redirect
登录成功后，系统 MUST 根据用户账户状态决定跳转目标。

#### Scenario: 登录后有交易账户
- **GIVEN** 用户成功完成登录
- **WHEN** 用户拥有一个或多个交易账户
- **THEN** 系统 MUST 跳转到 `/asset` 页面
- **THEN** 系统 MUST 设置最近使用的账户为选中账户

#### Scenario: 登录后无交易账户
- **GIVEN** 用户成功完成登录
- **WHEN** 用户没有任何交易账户
- **THEN** 系统 MUST 跳转到 `/account/create` 页面
- **THEN** 系统 MUST 显示提示 "请创建您的第一个交易账户"

