# database Specification Delta

此文件包含 Electricron Desktop 支持变更对 database specification 的增量变更。

## MODIFIED Requirements

### Requirement: Database Connection
系统 MUST 提供统一的数据库连接管理，使用 Drizzle ORM 和 LibSQL 客户端，并支持 Web 和 Desktop 环境的数据库路径差异。

#### Scenario: 数据库初始化
- **GIVEN** 应用启动
- **WHEN** 系统请求数据库实例
- **THEN** 系统 MUST 使用 LibSQL 客户端创建数据库连接
- **THEN** 系统 MUST 通过 DatabaseManager 单例管理连接
- **THEN** 系统 MUST 返回 Drizzle ORM 实例

#### Scenario: Web 环境数据库文件路径确定
- **GIVEN** 应用运行在 Web 环境（非 Electron）
- **WHEN** 系统初始化数据库连接
- **THEN** 数据库 MUST 存储在项目根目录下的 `sqlite.db`
- **THEN** 迁移文件 MUST 从项目根目录的 `drizzle/migrations` 读取

#### Scenario: Desktop 环境数据库文件路径确定
- **GIVEN** 应用运行在 Electron Desktop 环境
- **WHEN** 系统初始化数据库连接
- **THEN** 数据库 MUST 存储在用户数据目录（`app.getPath('userData')`）下的 `sqlite.db`
- **THEN** 这确保应用更新后用户数据不会丢失
- **THEN** 迁移文件 MUST 从 `process.cwd()` 的 `drizzle/migrations` 读取

#### Scenario: 开发环境数据库文件路径确定
- **GIVEN** 应用运行在开发环境
- **WHEN** 系统初始化数据库连接
- **THEN** 数据库 MUST 存储在项目根目录下的 `sqlite.db`
- **THEN** 迁移文件 MUST 从项目根目录的 `drizzle/migrations` 读取

#### Scenario: DatabaseManager 单例模式
- **GIVEN** 应用中多个模块请求数据库实例
- **WHEN** 多个模块调用 `DatabaseManager.getInstance()`
- **THEN** 系统 MUST 返回同一个 DatabaseManager 实例
- **THEN** 所有模块访问的是同一个数据库连接

#### Scenario: 数据库迁移
- **WHEN** 数据库连接初始化
- **THEN** 系统 MUST 自动执行数据库迁移
- **THEN** DatabaseManager MUST 根据环境（开发/生产/Web/Desktop）确定迁移文件路径

## ADDED Requirements

### Requirement: Desktop Database Path Management
系统 MUST 在 Electron Desktop 环境中提供正确的数据库路径管理。

#### Scenario: 传递 userDataPath 到 DatabaseManager
- **GIVEN** Electron 主进程启动
- **WHEN** 初始化 DatabaseManager
- **THEN** Electron 进程 MUST 通过环境变量 `NEXT_APP_USER_DATA` 传递 `app.getPath('userData')`
- **THEN** DatabaseManager MUST 使用此路径存储数据库

#### Scenario: 传递 appPath 到 DatabaseManager
- **GIVEN** Electron 主进程启动
- **WHEN** 初始化 DatabaseManager
- **THEN** Electron 进程 MUST 通过环境变量 `NEXT_APP_DATA_PATH` 传递 `app.getAppPath()`
- **THEN** DatabaseManager MUST 使用此路径确定应用资源位置

#### Scenario: 数据库目录自动创建
- **GIVEN** 数据库存储目录不存在
- **WHEN** DatabaseManager 初始化
- **THEN** 系统 MUST 自动创建数据库存储目录
- **THEN** 创建 MUST 失败时抛出错误

### Requirement: Database Health Check
系统 MUST 提供数据库连接健康检查端点。

#### Scenario: 健康检查 API
- **WHEN** GET 请求发送到 `/api/health`
- **THEN** 系统 MUST 返回 200 状态码
- **THEN** 响应 MUST 包含数据库连接状态
- **THEN** 响应 MUST 包含当前环境信息

#### Scenario: 健康检查用于 Electron 启动流程
- **GIVEN** Electron 应用启动
- **WHEN** utilityProcess 启动 Next.js 服务器
- **THEN** Electron 主进程 MUST 轮询 `/api/health` 端点
- **THEN** 直到收到 200 响应才创建窗口

### Requirement: Native Module ABI Validation
系统 MUST 在 Electron 生产环境中验证原生模块的 ABI 兼容性。

#### Scenario: 启动时检查 better-sqlite3 ABI
- **GIVEN** Electron 应用打包后启动
- **WHEN** 应用初始化
- **THEN** 系统 MUST 检查 `better-sqlite3.node` 的 ABI 版本
- **THEN** 如果 ABI 不匹配，系统 MUST 显示明确的错误对话框
- **THEN** 错误对话框 MUST 包含修复建议
- **THEN** 不匹配时应用 SHOULD 退出