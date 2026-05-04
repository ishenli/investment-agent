## ADDED Requirements

### Requirement: Account Deletion
系统 MUST 允许用户删除自己的交易账户，使用软删除机制保留历史数据用于审计。

#### Scenario: 正常删除账户
- **GIVEN** 用户已登录且有多个交易账户
- **WHEN** 用户请求删除某个账户
- **THEN** 系统 MUST 将该账户的 `deletedAt` 字段设置为当前时间
- **THEN** 系统 MUST 返回删除成功响应
- **THEN** 该账户 MUST 不再出现在用户的账户列表中

#### Scenario: 删除当前选中的账户
- **GIVEN** 用户删除的是当前选中的账户
- **WHEN** 删除操作成功完成
- **THEN** 系统 MUST 清除用户的选中账户状态
- **THEN** 如果有其他可用账户，系统 SHOULD 自动选择第一个可用账户
- **THEN** 如果没有其他账户，系统 MUST 重定向到账户创建页面

#### Scenario: 删除最后一个账户
- **GIVEN** 用户只有一个交易账户
- **WHEN** 用户请求删除该账户
- **THEN** 系统 MUST 允许删除
- **THEN** 删除成功后系统 MUST 重定向到账户创建页面

#### Scenario: 防止越权删除
- **GIVEN** 用户尝试删除不属于自己账户
- **WHEN** 系统验证账户所有权
- **THEN** 系统 MUST 返回 403 错误，拒绝删除请求

#### Scenario: 删除不存在的账户
- **GIVEN** 用户请求删除一个不存在的账户ID
- **WHEN** 系统查询该账户
- **THEN** 系统 MUST 返回 404 错误

### Requirement: Account Deletion Confirmation
系统 MUST 在用户删除账户前显示确认对话框，防止误操作。

#### Scenario: 显示删除确认对话框
- **GIVEN** 用户点击删除账户按钮
- **WHEN** 系统显示确认对话框
- **THEN** 对话框 MUST 显示账户名称和警告信息
- **THEN** 对话框 MUST 提供"确认删除"和"取消"两个选项
- **THEN** "取消" MUST 是默认选项

#### Scenario: 取消删除操作
- **GIVEN** 用户在删除确认对话框中点击"取消"
- **WHEN** 对话框关闭
- **THEN** 系统 MUST 不执行任何删除操作
- **THEN** 系统 MUST 保持原有状态

### Requirement: Soft Delete Data Filtering
系统 MUST 在所有查询中过滤已软删除的账户数据。

#### Scenario: 账户列表过滤
- **GIVEN** 用户请求获取账户列表
- **WHEN** 系统执行查询
- **THEN** 系统 MUST 只返回 `deletedAt` 为 null 的账户

#### Scenario: 单个账户查询过滤
- **GIVEN** 用户查询某个账户详情
- **WHEN** 该账户已被软删除
- **THEN** 系统 MUST 返回 404 错误，不返回账户信息

#### Scenario: 关联数据保留
- **GIVEN** 账户被软删除
- **WHEN** 查询该账户的历史数据
- **THEN** 系统 MUST 保留该账户的交易记录（transactions）用于审计
- **THEN** 系统 MUST 保留该账户的持仓记录（assetPositions）用于审计
- **THEN** 系统 MUST 保留该账户的快照记录（portfolioSnapshots）用于审计
