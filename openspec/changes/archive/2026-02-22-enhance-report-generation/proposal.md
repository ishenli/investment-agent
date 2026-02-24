# Change: Enhance Report Generation Quality and Real-time Data

## Why

当前 AI 报告生成功能存在以下核心问题：
1. **数据准确性不足**：业绩计算不完整（收益率、基准对比等均为 0），Prompt 缺少账户概览数据
2. **实时性不足**：依赖本地缓存数据，缺少实时行情注入，数据时效性无法验证
3. **工具实现粗糙**：返回原始 JSON，缺少时间范围过滤
4. **输出质量不可控**：仅依赖 Prompt 描述格式，无结构化约束

这些问题直接影响投资周报的价值，用户无法获得准确、及时的投资分析。

## What Changes

### 高优先级改进

- **数据准确性**
  - 完善业绩计算逻辑，引入历史净值快照对比
  - 支持时间加权收益率（TWR）计算，处理资金变动对收益的影响
  - 实现每日快照自动调度（应用启动检查 + 后台定时器）
  - 支持交易日判断和收盘时间窗口
  - 支持历史快照断档回填
  - 补充 Prompt 中缺失的账户业绩数据
  - 添加持仓详情（成本、现价、盈亏）传递给 AI

- **实时性**
  - 在报告生成阶段注入实时行情数据
  - 添加数据时效性标记和验证机制
  - 预执行关键工具调用确保数据新鲜

### 中优先级改进

- **工具实现**
  - 增强笔记查询工具支持时间范围过滤
  - 结构化 Tavily 搜索结果输出
  - 添加数据来源追溯信息

- **输出质量**
  - 使用 LangChain StructuredOutputParser 约束输出格式
  - 多阶段生成流程（提纲 → 章节 → 组装）
  - 添加报告生成进度状态追踪

## Impact

- **Affected specs**:
  - `report-editing` - 无直接影响，但报告内容结构可能变化
  - 新增 `report-generation` capability

- **Affected code**:
  - `src/server/service/reportService.ts` - 核心改造
  - `src/server/core/tools/` - 工具增强
  - `drizzle/schema.ts` - 新增历史净值快照表
  - `electron/main.ts` - 新增快照调度器初始化
  - `src/server/service/snapshotService.ts` - 新增快照服务

- **Breaking changes**: 无（API 接口保持兼容）

## Success Criteria

1. 业绩计算准确率 > 99%（与手动计算对比）
2. 实时数据延迟 < 5 分钟
3. 报告生成成功率 > 95%
4. 用户满意度评分 > 4.0/5.0