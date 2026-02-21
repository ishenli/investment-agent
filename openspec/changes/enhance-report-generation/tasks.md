# 任务：Enhance Report Generation

**输入**：来自 `/openspec/changes/enhance-report-generation/specs/report-generation/spec.md` 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 代码检查：`pnpm run lint`
- 单元测试：`pnpm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 路径约定

| 类型 | 路径 |
|------|------|
| Service | `src/server/service/reportService.ts` |
| Tools | `src/server/core/tools/` |
| Schema | `drizzle/schema/` |
| Types | `src/types/` |

---

## 第0阶段：准备（设计与验证）

- [x] T000 创建变更目录结构 `openspec/changes/enhance-report-generation/` <!-- id: 0 -->
- [x] T001 编写 proposal.md 描述变更意图和影响 <!-- id: 1 -->
- [x] T002 编写 plan.md 技术设计文档 <!-- id: 2 -->
- [x] T003 编写 spec delta 规范变更 <!-- id: 3 -->
- [x] T004 运行 `openspec validate enhance-report-generation --strict` 验证 <!-- id: 4 -->

---

## 第1阶段：设置（基础设施）

**目的**：类型定义和数据库 Schema

- [x] T005 [P] 在 `src/types/report.ts` 中定义新类型 <!-- id: 5 -->
  - `PerformanceCalculation` 类型
  - `EnrichedPosition` 类型
  - `ReportGenerationProgress` 类型
  - `DataSourceSummary` 类型

- [x] T006 [P] 在 `drizzle/schema.ts` 创建快照表 Schema <!-- id: 6 -->

- [x] T007 在 `drizzle/schema.ts` 导出新表并添加索引 <!-- id: 7 -->

- [x] T008 运行 `pnpm db:generate` 生成迁移文件 <!-- id: 8 -->

---

## 第2阶段：基础（服务层 - P1 业绩计算）

**目的**：核心业绩计算逻辑

**⚠️ 关键**：此阶段完成前不应开始后续 UI 工作

### 2.1 快照服务

- [x] T009 创建 `src/server/service/portfolioSnapshotService.ts` <!-- id: 9 -->
- [x] T010 实现 `createSnapshot(accountId, date)` 创建快照 <!-- id: 10 -->
- [x] T011 实现 `getNearestSnapshot(accountId, date)` 获取最近快照 <!-- id: 11 -->
- [x] T012 实现 `getSnapshotsByDateRange(accountId, start, end)` 批量获取 <!-- id: 12 -->

### 2.2 业绩计算

- [x] T013 在 `reportService.ts` 实现 `calculatePerformance()` 方法 <!-- id: 13 -->
  - 期初/期末净值获取
  - 收益率计算
  - 基准收益对比（SPY 或用户配置）
  - 超额收益计算

- [ ] T014 编写业绩计算单元测试 <!-- id: 14 -->

**检查点**：业绩计算逻辑就绪，可以开始实时数据阶段

---

## 第3阶段：基础（服务层 - P1 实时数据）

**目的**：实时行情注入与数据时效性

### 3.1 实时行情服务

- [x] T015 复用 `src/server/service/unifiedPriceService` 实现 <!-- id: 15 -->
- [x] T016 使用 `batchGetQuote(symbols)` 批量获取行情 <!-- id: 16 -->
  - 使用 Finnhub/Tencent API 或缓存行情
  - 返回结构化 Quote 对象

- [x] T017 复用 `SameDayPriceCache` 缓存机制 <!-- id: 17 -->

### 3.2 数据时效性验证

- [x] T018 实现 `validateDataFreshness(data)` 数据新鲜度验证 <!-- id: 18 -->
- [x] T019 实现 `calculateStaleness(timestamp)` 计算数据陈旧度 <!-- id: 19 -->

### 3.3 集成到报告服务

- [x] T020 在 `aggregateWeeklyData()` 中集成实时行情注入 <!-- id: 20 -->
- [x] T021 在 `aggregateWeeklyData()` 中集成业绩计算 <!-- id: 21 -->
- [x] T022 添加数据来源摘要生成 <!-- id: 22 -->

- [ ] T023 编写实时数据注入单元测试 <!-- id: 23 -->

**检查点**：实时数据注入就绪，可以开始 AI 生成改造

---

## 第4阶段：API 改造

**目的**：更新 API 支持新数据结构

- [x] T024 更新 `src/app/api/report/route.ts` POST 方法 <!-- id: 24 -->
  - 验证 Schema 更新
  - 支持自定义时间范围

- [x] T025 更新 `src/app/api/report/[id]/route.ts` GET 方法 <!-- id: 25 -->
  - 返回增强的报告详情
  - 包含数据来源信息

- [ ] T026 添加报告进度查询 API（可选）<!-- id: 26 -->

---

## 第5阶段：User Story 1 - 准确业绩计算 (优先级：P1) 🎯 MVP

**目标**：用户能够看到准确的投资业绩数据
**独立测试**：生成报告后验证业绩计算与手动计算一致

### 实现

- [x] T027 [US1] 更新 `buildAIPrompt()` 补充账户业绩数据 <!-- id: 27 -->
  - 添加期初/期末净值
  - 添加收益率和超额收益
  - 添加基准对比

- [x] T028 [US1] 更新 `buildAIPrompt()` 补充持仓详情 <!-- id: 28 -->
  - 添加成本价、现价、盈亏比例
  - 添加实时价格更新时间

- [ ] T029 [US1] 集成测试：验证完整业绩计算流程 <!-- id: 29 -->

**检查点**：P1 业绩功能完整可用

---

## 第6阶段：User Story 2 - 实时数据注入 (优先级：P1)

**目标**：报告包含最新市场数据
**独立测试**：生成报告后验证数据时间戳在合理范围内

### 实现

- [x] T030 [US1] 完善实时数据注入逻辑 <!-- id: 30 -->
- [x] T031 [US1] 添加数据时效性警告机制 <!-- id: 31 -->
  - 数据超过 1 小时显示警告
  - 非交易时间提示

- [ ] T032 [US1] 更新报告详情页显示数据来源 <!-- id: 32 -->

**检查点**：P1 实时数据功能完整可用

---

## 第7阶段：User Story 3 - 工具增强 (优先级：P2)

**目标**：AI 工具返回结构化、精准的数据
**独立测试**：直接调用工具验证返回格式

### 实现

- [ ] T033 [P] [US2] 增强 `noteTool.ts` 支持时间范围过滤 <!-- id: 33 -->
  - 添加 startDate/endDate 参数
  - 添加 symbols 过滤

- [ ] T034 [P] [US2] 增强 `searchTool.ts` 结构化输出 <!-- id: 34 -->
  - 返回精简的搜索结果
  - 包含来源、时间、相关性评分

- [ ] T035 [US2] 编写工具增强单元测试 <!-- id: 35 -->

---

## 第8阶段：User Story 4 - 结构化输出 (优先级：P2)

**目标**：报告格式一致、结构清晰
**独立测试**：验证所有生成的报告包含必要章节

### 实现

- [ ] T036 [US2] 定义报告输出 Zod Schema <!-- id: 36 -->
  - summary: 概述
  - marketOverview: 市场概览
  - positionAnalysis: 持仓分析[]
  - riskWarnings: 风险提示[]
  - nextWeekOutlook: 下周展望

- [ ] T037 [US2] 使用 StructuredOutputParser 约束 AI 输出 <!-- id: 37 -->

- [ ] T038 [US2] 实现多阶段生成流程（可选优化）<!-- id: 38 -->
  - 提纲生成
  - 章节并行生成
  - 组装验证

- [ ] T039 [US2] 编写结构化输出测试 <!-- id: 39 -->

---

## 第9阶段：User Story 5 - 进度反馈 (优先级：P3)

**目标**：用户可见报告生成进度
**独立测试**：观察进度条更新

### 实现

- [ ] T040 [US3] 扩展数据库字段存储生成进度 <!-- id: 40 -->
  - generationProgress: 0-100
  - generationStage: 当前阶段描述

- [ ] T041 [US3] 在生成过程中更新进度状态 <!-- id: 41 -->

- [ ] T042 [US3] 更新前端轮询显示进度 <!-- id: 42 -->

---

## 第10阶段：完善与质量保证

**目的**：跨功能的改进和质量检查

- [ ] T043 运行 `pnpm run lint` 并修复问题 <!-- id: 43 -->
- [ ] T044 运行 `pnpm run types:check` 确保类型正确 <!-- id: 44 -->
- [ ] T045 运行 `pnpm test` 确保测试通过 <!-- id: 45 -->
- [ ] T046 添加/更新相关文档 <!-- id: 46 -->
- [ ] T047 性能优化审查（生成时间 < 60s）<!-- id: 47 -->

---

## 第11阶段：归档准备

- [ ] T048 更新所有 TODO 状态为完成 <!-- id: 48 -->
- [ ] T049 验证所有场景在 spec.md 中已实现 <!-- id: 49 -->
- [ ] T050 运行 `openspec validate enhance-report-generation --strict` <!-- id: 50 -->

---

## 依赖关系

### 阶段依赖

```
第0阶段 (准备)
    ↓
第1阶段 (设置) ─────────────────────────┐
    ↓                                    │
第2阶段 (业绩计算) ─┬─→ 第3阶段 (实时数据) │
    ↓               │         ↓          │
    └───────────────┴→ 第4阶段 (API) ←───┘
                          ↓
              第5-6阶段 (P1 User Stories)
                          ↓
              第7-8阶段 (P2 User Stories)
                          ↓
              第9阶段 (P3 进度反馈)
                          ↓
              第10阶段 (完善)
                          ↓
              第11阶段 (归档)
```

### 并行机会

- T005 类型定义 与 T006 Schema 可以并行
- 第2阶段与第3阶段部分任务可并行开发
- T033 工具增强 与 T034 工具增强可以并行

### 关键路径

```
T005 → T009 → T013 → T020 → T027 → T029
                              ↑
                    T015 → T020
```

预计最短完成路径：约 15 个串行任务