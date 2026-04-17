## MODIFIED Requirements

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

#### Scenario: 创建买入人民币基金交易
- **GIVEN** 用户选择"买入"类型，资产类型选择"fund"，市场选择"CN"
- **WHEN** 用户输入基金代码（如 110011）、份额数量和单位净值（人民币）
- **THEN** 系统必须（MUST）将交易的 currency 标记为 'CNY'
- **THEN** 系统必须（MUST）以人民币原始金额存储交易金额（priceCents 以分为单位）
- **THEN** 系统必须（MUST）创建持仓记录，averagePriceCents 以人民币分存储
- **THEN** 系统必须（MUST）不将金额自动转换为美元

#### Scenario: 创建卖出交易
- **GIVEN** 用户持有对应股票的仓位
- **WHEN** 用户选择"卖出"类型，输入股票代码、数量、价格、资产类型和市场类型
- **THEN** 系统必须（MUST）验证数量和价格字段已提供
- **THEN** 系统必须（MUST）计算总金额并创建交易记录
- **THEN** 系统必须（MUST）更新持仓仓位
- **THEN** 系统必须（MUST）增加账户余额

#### Scenario: 创建卖出人民币基金交易
- **GIVEN** 用户持有人民币基金仓位
- **WHEN** 用户选择"卖出"类型，资产类型为"fund"，市场为"CN"
- **THEN** 系统必须（MUST）以人民币原始金额计算卖出金额
- **THEN** 系统必须（MUST）更新持仓仓位

#### Scenario: 交易类型字段显示逻辑
- **WHEN** 用户选择入金或出金类型
- **THEN** 系统必须（MUST）隐藏"资产类型"和"市场类型"字段
- **THEN** 系统必须（MUST）显示"资金类型"选择器（美元/港币/人民币）
- **WHEN** 用户选择买入或卖出类型
- **THEN** 系统必须（MUST）显示"资产类型"和"市场类型"字段
- **THEN** 系统必须（MUST）隐藏"资金类型"选择器
- **WHEN** 用户选择资产类型为"fund"且市场为"CN"
- **THEN** 系统必须（MUST）显示"人民币计价"标识，提示用户价格以人民币输入

#### Scenario: 交易时间可选
- **WHEN** 用户创建新交易
- **THEN** 系统可以（MAY）提供交易时间选择字段
- **THEN** 系统必须（MUST）在用户未选择时间时使用当前时间作为默认值
