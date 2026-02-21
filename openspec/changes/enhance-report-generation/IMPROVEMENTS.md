# Spec 改进建议

## ✅ 已修复（P0）

- [x] 添加 `## ADDED Requirements` delta header（验证通过）
- [x] 统一数据模型：plan.md 与 spec.md 使用一致的 `integer` + `Cents` 字段

---

## ✅ 已修复（P1）

- [x] **基准数据获取规范**：新增 `Requirement: Benchmark Data Fetching`
  - 明确 Finnhub API `/api/v1/stock/candle` 端点使用
  - 定义缓存策略（24 小时有效期）
  - 处理限流和错误降级
  - 明确非交易日处理逻辑

- [x] **快照调度错误处理**：在 `Requirement: Snapshot Scheduling` 中新增 3 个 scenario
  - 快照创建失败重试机制（指数退避：1分、5分、15分）
  - 多账户并发创建和事务隔离
  - 重试状态跟踪机制

- [x] **与 report-editing 兼容性**：新增 `Requirement: Backward Compatibility with Report Editing`
  - 定义手动编辑元数据（isManuallyEdited, lastEditedAt, editCount）
  - 明确元数据保留规则
  - 用户界面警告提示
  - 结构化输出兼容性

✅ **验证状态**：`openspec validate enhance-report-generation --strict` ✓

---


## 🟡 可选优化（P2）

### 4. TWR 计算步骤细化

**建议**：在现有 `Scenario: Calculate Time-Weighted Return with Cash Flows` 后增加实现细节：

```markdown
#### Scenario: Identify Cash Flow Events
- **GIVEN** 报告周期为 startDate 到 endDate
- **WHEN** 系统计算 TWR
- **THEN** 系统 MUST 查询 `transactions` 表中类型为 `deposit` 或 `withdrawal` 的记录
- **THEN** 系统 MUST 按交易日期排序所有资金变动
- **THEN** 系统 MUST 将周期划分为 N 个子期间（子期间数 = 资金变动次数 + 1）

#### Scenario: Handle Same-Day Multiple Cash Flows
- **GIVEN** 同一天发生多笔入金或出金
- **WHEN** 系统计算 TWR
- **THEN** 系统 MUST 合并同一天的所有资金变动
- **THEN** 系统 MUST 使用日终净值进行计算
```

---

### 5. AI 生成降级策略

**建议**：增加 AI 失败场景处理：

```markdown
### Requirement: AI Generation Failure Fallback
系统 MUST 在 AI 生成失败时提供降级方案，确保用户仍能获得数据汇总。

#### Scenario: AI Generation Timeout
- **GIVEN** AI 生成超过 90 秒未完成
- **WHEN** 系统检测到超时
- **THEN** 系统 MUST 终止 AI 调用
- **THEN** 系统 MUST 生成简化版报告（仅数据表格，无分析文本）
- **THEN** 系统 MUST 在报告中标注"AI 分析生成失败，仅展示数据汇总"
- **THEN** 系统 MUST 提供"重新生成"按钮供用户重试

#### Scenario: Structured Output Validation Failure
- **GIVEN** AI 返回的内容不符合 Zod Schema
- **WHEN** 系统验证输出格式
- **THEN** 系统 MUST 尝试使用更严格的 Prompt 重新生成（最多 1 次）
- **THEN** 如果再次失败，系统 MUST 回退到使用原始 AI 输出（Markdown 格式）
- **THEN** 系统 MUST 记录验证失败日志供调试
```

---

### 6. 性能验证场景

**建议**：在 spec.md 末尾增加性能要求：

```markdown
### Requirement: Performance Benchmarks
系统 MUST 满足报告生成的性能目标，确保用户体验流畅。

#### Scenario: Report Generation Time Limit
- **GIVEN** 用户请求生成周报
- **WHEN** 系统处理报告生成请求
- **THEN** 数据聚合阶段 MUST 在 10 秒内完成
- **THEN** AI 生成阶段 MUST 在 50 秒内完成
- **THEN** 总生成时间 MUST 小于 60 秒（P95）

#### Scenario: Batch Quote API Call Optimization
- **GIVEN** 用户账户有 20+ 持仓
- **WHEN** 系统获取实时行情
- **THEN** 系统 MUST 使用批量 API 调用（单次最多 50 个股票）
- **THEN** 系统 MUST 并行请求不同批次
- **THEN** 行情获取总耗时 MUST 小于 5 秒
```

---

## 📊 实施优先级

1. **立即实施**（阻塞开发）：✅ 已完成
2. **开发前完成**（P1）：✅ 已完成
3. **实现时考虑**（P2）：TWR 细节、降级策略、性能验证

### 🎉 关键里程碑

✅ Spec 验证通过：`openspec validate enhance-report-generation --strict`
✅ 所有 P0 和 P1 问题已解决
✅ 可以安全进入实现阶段

---

## 🔗 相关文件

- `openspec/changes/enhance-report-generation/specs/report-generation/spec.md`
- `openspec/changes/enhance-report-generation/plan.md`
- `openspec/changes/enhance-report-generation/tasks.md`
