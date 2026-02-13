# transaction Specification

## Purpose
交易模块提供完整的投资交易记录管理能力，支持入金、出金、买入证券、卖出证券等交易类型，并自动维护账户资金余额和持仓仓位。系统通过统一的交易记录管理，帮助用户跟踪所有资金流动和资产变动。

## Requirements

### Requirement: Transaction Record Creation
系统 MUST 提供创建新交易记录的能力，支持四种交易类型：入金、出金、买入、卖出。

#### Scenario: 创建入金交易
- **GIVEN** 用户已登录并选择了当前交易账户
- **WHEN** 用户打开添加交易对话框，选择"入金"类型，输入金额和资金类型（USD/HKD/CNY）
- **THEN** 系统必须（MUST）根据选择的货币类型和汇率将金额转换为美元
- **THEN** 系统必须（MUST）创建交易记录，market 字段存储资金类型
- **THEN** 系统必须（MUST）更新 accountFunds 表的余额和 currency 字段
- **THEN** 系统必须（MUST）自动选择美元作为默认资金类型

#### Scenario: 创建出金交易
- **GIVEN** 用户已有足额的账户余额
- **WHEN** 用户选择"出金"类型，输入金额和资金类型
- **THEN** 系统必须（MUST）验证账户余额是否足够
- **THEN** 系统必须（MUST）创建交易记录并扣减账户余额

#### Scenario: 创建买入交易
- **GIVEN** 用户有足够的账户余额
- **WHEN** 用户选择"买入"类型，输入股票代码、数量、价格、资产类型和市场类型
- **THEN** 系统必须（MUST）验证数量和价格字段已提供
- **THEN** 系统必须（MUST）计算总金额并创建交易记录（`totalAmount = quantity * price`）
- **THEN** 系统必须（MUST）调用 positionService 更新持仓仓位
- **THEN** 系统必须（MUST）扣减账户余额

#### Scenario: 创建卖出交易
- **GIVEN** 用户持有对应股票的仓位
- **WHEN** 用户选择"卖出"类型，输入股票代码、数量、价格、资产类型和市场类型
- **THEN** 系统必须（MUST）验证数量和价格字段已提供
- **THEN** 系统必须（MUST）计算总金额并创建交易记录
- **THEN** 系统必须（MUST）更新持仓仓位
- **THEN** 系统必须（MUST）增加账户余额

#### Scenario: 交易类型字段显示逻辑
- **WHEN** 用户选择入金或出金类型
- **THEN** 系统必须（MUST）隐藏"资产类型"和"市场类型"字段
- **THEN** 系统必须（MUST）显示"资金类型"选择器（美元/港币/人民币）
- **WHEN** 用户选择买入或卖出类型
- **THEN** 系统必须（MUST）显示"资产类型"和"市场类型"字段
- **THEN** 系统必须（MUST）隐藏"资金类型"选择器

#### Scenario: 交易时间可选
- **WHEN** 用户创建新交易
- **THEN** 系统可以（MAY）提供交易时间选择字段
- **THEN** 系统必须（MUST）在用户未选择时间时使用当前时间作为默认值

### Requirement: Transaction History Query
系统 MUST 提供查询交易历史的能力，支持分页和过滤。

#### Scenario: 获取交易历史
- **GIVEN** 用户已登录并选择了当前交易账户
- **WHEN** 系统加载交易记录页面
- **THEN** 系统必须（MUST）按创建时间倒序返回交易列表
- **THEN** 系统必须（MUST）支持分页查询，默认返回 50 条记录
- **THEN** 系统必须（MUST）返回交易总数用于分页组件

#### Scenario: 交易记录搜索
- **GIVEN** 用户在交易历史页面
- **WHEN** 用户输入搜索关键词
- **THEN** 系统必须（MUST）根据描述字段进行模糊匹配
- **THEN** 系统必须（MUST）处理 description 为 null 或 undefined 的情况
- **THEN** 系统可以（MAY）支持按其他字段（如股票代码）进行搜索

#### Scenario: 交易记录排序
- **WHEN** 用户查看交易历史
- **THEN** 系统必须（MUST）默认按创建时间倒序排列
- **THEN** 系统可以（MAY）支持用户选择其他排序方式

### Requirement: Transaction Record Update
系统 MUST 提供编辑已有交易记录的能力。

#### Scenario: 编辑交易记录
- **GIVEN** 用户想要修改已有交易
- **WHEN** 用户选择编辑交易记录
- **THEN** 系统必须（MUST）预填充现有交易数据到表单
- **THEN** 系统必须（MUST）根据交易类型显示/隐藏相应字段
- **THEN** 系统必须（MUST）允许修改所有可编辑字段

#### Scenario: 编辑出入金交易
- **WHEN** 用户编辑入金或出金交易
- **THEN** 系统必须（MUST）显示资金类型选择器
- **THEN** 系统必须（MUST）隐藏资产类型和市场类型字段
- **THEN** 系统必须（MUST）支持修改金额和资金类型

#### Scenario: 编辑交易后的数据一致性
- **WHEN** 用户编辑交易记录类型
- **THEN** 系统必须（MUST）撤销原交易对余额和仓位的影响
- **THEN** 系统必须（MUST）应用新交易对余额和仓位的影响
- **THEN** 系统必须（MUST）确保数据的完整性

### Requirement: Currency Type Support
系统 MUST 支持多货币类型用于出入金交易。

#### Scenario: 资金类型存储
- **WHEN** 创建出入金交易
- **THEN** 系统必须（MUST）在 transactions 表的 market 字段存储资金类型
- **THEN** 系统必须（MUST）在 accountFunds 表的 currency 字段存储货币代码（USD/HKD/CNY）

#### Scenario: 资金类型映射
- **WHEN** 系统存储资金类型时
- **THEN** US 市场类型 MUST 映射为 'USD' 货币代码
- **THEN** HK 市场类型 MUST 映射为 'HKD' 货币代码
- **THEN** CN 市场类型 MUST 映射为 'CNY' 货币代码
- **THEN** 其他类型 MUST 默认映射为 'USD' 货币代码

#### Scenario: 货币转换
- **WHEN** 用户创建非美元的出入金交易
- **THEN** 系统必须（MUST）使用预设汇率将本地货币转换为美元存储
- **THEN** 系统必须（MUST）保留原始货币类型信息以供后续显示

### Requirement: Balance Management
系统 MUST 自动维护账户资金余额。

#### Scenario: 入金余额更新
- **GIVEN** 账户当前余额为 $1000
- **WHEN** 用户入金 $500
- **THEN** 系统必须（MUST）更新账户余额为 $1500

#### Scenario: 出金余额更新
- **GIVEN** 账户当前余额为 $1500
- **WHEN** 用户出金 $500
- **THEN** 系统必须（MUST）更新账户余额为 $1000

#### Scenario: 首次入金创建账户资金记录
- **GIVEN** 用户首次入金，accountFunds 表中无对应记录
- **WHEN** 用户完成入金操作
- **THEN** 系统必须（MUST）在 accountFunds 表中创建新记录
- **THEN** 系统必须（MUST）设置正确的 accountId、amountCents 和 currency 字段

### Requirement: Error Handling
系统 MUST 提供完善的错误处理机制。

#### Scenario: 必填字段验证失败
- **WHEN** 买入或卖出交易缺少数量或价格字段
- **THEN** 系统必须（MUST）抛出明确错误消息："买入/卖出交易必须提供数量和价格"
- **THEN** 系统必须（MUST）阻止交易的创建

#### Scenario: 数据库操作失败
- **WHEN** 数据库插入或更新操作失败
- **THEN** 系统必须（MUST）捕获错误并记录到日志
- **THEN** 系统必须（MUST）向用户返回友好的错误消息

#### Scenario: description 字段为空值处理
- **WHEN** 交易记录的 description 字段为 null 或 undefined
- **THEN** 系统必须（MUST）在查询和历史显示中使用空字符串替代
- **THEN** 系统必须（MUST）避免在 toLowerCase() 调用时抛出错误

### Requirement: Backward Compatibility
系统 MUST 保持与旧数据的向后兼容性。

#### Scenario: 处理无 market 字段的旧交易
- **GIVEN** 存在没有 market 字段的旧交易记录
- **WHEN** 系统查询或处理这些记录
- **THEN** 系统必须（MUST）将 market 字段视为 'US'（美元）
- **THEN** 系统必须（MUST）正常运行而不报错

## Usage Pattern

### 典型调用流程

1. **创建入金交易**:
   - 前端用户操作: `src/app/components/add-transaction-dialog.tsx`
   - 前端转换: 用户输入金额 → `convertToUSD(amount, currencyType)` → 美元金额
   - API 调用: `POST /api/transaction` → `transactionService.addTransaction()`
   - 后端处理: `src/server/service/transactionService.ts:87` → 创建交易记录，更新 accountFunds

2. **创建买入交易**:
   - 前端用户操作: 输入股票代码、数量、价格、资产类型、市场类型
   - 计算总金额: `totalAmount = quantity * price`
   - API 调用: `POST /api/transaction` → `transactionService.addTransaction()`
   - 后端处理: 创建交易记录 → 调用 `positionService.processTransaction()` → 扣减余额

3. **查询交易历史**:
   - API 调用: `GET /api/transaction?limit=50&offset=0`
   - 服务层: `transactionService.getTransactionHistory()` → `src/server/service/transactionService.ts:21`
   - 返回数据: 交易列表 + 总数

4. **编辑交易记录**:
   - 前端操作: 点击编辑 → 填充表单 → 修改字段 → 提交
   - API 调用: `PUT /api/transaction/{id}`
   - 服务层: `transactionService.updateTransaction()` → `src/server/service/transactionService.ts:224`
   - 数据一致性: 撤销旧交易影响 → 应用新交易影响

### 错误处理

- **必填字段缺失**: `throw new Error('买入/卖出交易必须提供数量和价格')` → 前端显示错误提示
- **数据库操作失败**: `try-catch` 捕获 → `logger.error()` 记录 → 返回友好错误消息
- **余额不足**: 验证账户余额 → 阻止操作 → 提示余额不足
- **description 为 null**: 使用空字符串 → `description || ''` → 避免 toLowerCase() 报错

## Dependencies

### 外部依赖
- **Drizzle ORM**: 数据库查询和操作 - 用于 transactions 和 accountFunds 表的 CRUD 操作
- **Zod**: 请求体验证 - `src/types/transaction.ts:5` 定义 TransactionRequestSchema
- **LibSQL Client**: 数据库驱动 - 通过 @libsql/client 连接 SQLite 数据库

### 内部依赖
- **positionService**: 仓位管理服务 (`src/server/service/positionService.ts`) - 处理股票交易对仓位的影响
- **DatabaseManager**: 数据库连接管理 (`src/server/lib/DatabaseManager.ts`) - 管理数据库连接和环境配置
- **AccountFundsModel**: 账户资金模型 (`src/drizzle/schema.ts`) - accountFunds 表定义

## Notes
- **货币转换**: 前端负责将本地货币转换为美元，后端存储美元金额和原始货币类型
- **账户余额计算**: 入金增加余额，出金减少余额，买入扣减余额，卖出增加余额
- **仓位管理**: 只有买入和卖出交易影响仓位，出入金交易不影响
- **市场字段复用**: 对于出入金，market 字段存储货币类型；对于股票交易，market 字段存储市场类型（US/HK/CN）
- **事务一致性**: 更新交易、余额和仓位时应保证数据一致性
- **向后兼容**: 老数据没有 market 字段时视为 USD，不影响现有功能
- **搜索安全**: 所有涉及可选字符串字段的搜索都必须进行 null/undefined 检查