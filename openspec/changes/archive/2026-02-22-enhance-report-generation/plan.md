# 实现计划：Enhance Report Generation

**分支**：`enhance-report-generation` | **日期**：2026-02-15 | **规范**：`openspec/changes/enhance-report-generation/specs/report-generation/spec.md`
**输入**：现有 `reportService.ts` 实现分析

## 概要

提升 AI 报告生成功能的数据准确性和实时性，通过以下技术方案：
1. 引入投资组合快照机制计算历史业绩
2. 实时行情注入与数据时效性验证
3. 结构化输出生成与多阶段处理流程

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, LangChain.js 1.x, Drizzle ORM 0.44
**存储**：SQLite (prod), IndexedDB (client-side via Dexie)
**测试**：Vitest
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：报告生成 < 60s，数据聚合 < 10s
**约束条件**：API 限流管理，离线缓存支持

## 规范检查

- [x] 符合项目规范
- [x] TypeScript 严格模式约束
- [x] OpenSpec delta 格式正确性

## 项目结构

### 文档（此功能）

```text
openspec/changes/enhance-report-generation/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── report-generation/   # 新增 capability
        └── spec.md          # 完整规范
```

### 源代码（项目根目录）

```text
src/
├── server/
│   ├── service/
│   │   ├── reportService.ts           # 核心改造
│   │   ├── portfolioSnapshotService.ts # 新增：快照服务
│   │   ├── realtimeQuoteService.ts    # 新增：实时行情服务
│   │   └── benchmarkService.ts        # 新增：基准数据服务
│   └── core/
│       └── tools/
│           ├── noteTool.ts            # 增强：时间过滤
│           └── searchTool.ts          # 增强：结构化输出
├── drizzle/
│   └── schema/
│       ├── portfolioSnapshots.ts      # 新增：快照表
│       └── analysisReports.ts         # 修改：新增编辑元数据字段
└── types/
    └── report.ts                      # 新增：报告类型定义
```

**结构决策**：遵循现有服务层架构，新增独立服务模块处理快照和实时数据。

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 作为用户，我需要准确的业绩计算，以便了解真实投资收益 | 对比手动计算验证 |
| P1 | 作为用户，我需要实时行情数据，以便获得最新市场分析 | 检查数据时间戳 |
| P2 | 作为用户，我需要结构化的报告格式，以便快速定位关键信息 | 验证报告章节结构 |
| P2 | 作为用户，我需要数据来源追溯，以便信任报告内容 | 检查数据来源标记 |
| P3 | 作为用户，我需要生成进度反馈，以便了解报告生成状态 | 检查进度条更新 |

## 技术架构

### 数据流

```
┌─────────────────────────────────────────────────────────────────────┐
│                        报告生成流程 v2                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 数据聚合阶段 (aggregateReportData)                              │
│     ├── 实时行情注入 (realtimeQuoteService)                         │
│     ├── 历史快照获取 (portfolioSnapshotService)                     │
│     ├── 业绩计算 (calculatePerformance)                             │
│     └── 数据时效性验证 (validateDataFreshness)                      │
│                                                                     │
│  2. 报告生成阶段 (generateReportContent)                            │
│     ├── 构建结构化 Prompt                                           │
│     ├── 多阶段 AI 生成                                              │
│     │   ├── 提纲生成                                                │
│     │   ├── 章节并行生成                                            │
│     │   └── 组装与格式化                                            │
│     └── 输出格式验证                                                │
│                                                                     │
│  3. 后处理阶段                                                       │
│     ├── 数据来源标记                                                │
│     ├── 质量评分                                                    │
│     └── 持久化存储                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 状态管理

- **服务端**：
  - 报告生成状态存储在 `analysis_reports` 表
  - 新增 `generationProgress` 字段追踪进度
  - 快照数据存储在 `portfolio_snapshots` 表

- **客户端**：
  - 使用现有 React Query 轮询机制
  - 扩展 `useReport` hook 支持进度显示

- **缓存策略**：
  - 实时行情缓存 5 分钟
  - 快照数据持久化存储
  - 报告内容不可变

### 外部集成

- **LangChain.js**：
  - 使用 `StructuredOutputParser` 约束输出
  - Agent 工具链增强

- **Finnhub API**：
  - 批量获取实时行情
  - 新闻数据获取

- **数据库**：
  - 新增 `portfolio_snapshots` 表存储历史净值

## 新增数据模型

### portfolio_snapshots 表

```typescript
// drizzle/schema/portfolioSnapshots.ts
export const portfolioSnapshots = sqliteTable('portfolio_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  snapshotDate: integer('snapshot_date', { mode: 'timestamp' }).notNull(),
  totalValueCents: integer('total_value_cents').notNull(),    // 总市值（分）
  cashBalanceCents: integer('cash_balance_cents').notNull(),  // 现金余额（分）
  positions: text('positions', { mode: 'json' }).notNull(),   // JSON: 持仓快照
  benchmarkValueCents: integer('benchmark_value_cents'),      // 基准价值（分）
  benchmarkSymbol: text('benchmark_symbol').default('SPY'),   // 基准代码
  source: text('source', { enum: ['scheduled', 'manual', 'backfill'] }).notNull().default('scheduled'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 唯一约束：每个账户每天最多一条快照
// UNIQUE(account_id, snapshot_date)

// 索引
createIndex('idx_snapshots_account_date', 'portfolio_snapshots', ['account_id', 'snapshot_date']);
```

### 扩展 analysis_reports 表

```typescript
// 新增字段
generationProgress: integer('generation_progress').default(0),  // 0-100
generationStage: text('generation_stage'),  // 当前阶段
dataSourceSummary: text('data_source_summary'),  // JSON: 数据来源摘要

// 手动编辑元数据（P1 兼容性）
isManuallyEdited: integer('is_manually_edited', { mode: 'boolean' }).default(false),
lastEditedAt: integer('last_edited_at', { mode: 'timestamp' }),
editCount: integer('edit_count').default(0),
```

## 核心算法

### 业绩计算算法

```typescript
interface PerformanceCalculation {
  // 时间范围业绩
  startValue: number;      // 期初净值
  endValue: number;        // 期末净值
  changeAmount: number;    // 绝对收益
  changePercentage: number; // 收益率

  // 基准对比
  benchmarkReturn: number; // 基准收益率
  excessReturn: number;    // 超额收益

  // 风险指标（可选）
  maxDrawdown?: number;    // 最大回撤
  volatility?: number;     // 波动率
}

async function calculatePerformance(
  accountId: string,
  startDate: Date,
  endDate: Date,
): Promise<PerformanceCalculation> {
  // 1. 获取期初快照
  const startSnapshot = await getNearestSnapshot(accountId, startDate);

  // 2. 获取期末快照（或实时计算）
  const endSnapshot = await getNearestSnapshot(accountId, endDate);

  // 3. 计算收益
  const changeAmount = endSnapshot.totalValue - startSnapshot.totalValue;
  const changePercentage = (changeAmount / startSnapshot.totalValue) * 100;

  // 4. 基准对比
  const benchmarkReturn = await getBenchmarkReturn(startDate, endDate);
  const excessReturn = changePercentage - benchmarkReturn;

  return { startValue, endValue, changeAmount, changePercentage, benchmarkReturn, excessReturn };
}
```

### 实时数据注入算法

```typescript
async function enrichWithRealtimeData(
  positions: PositionType[],
): Promise<EnrichedPosition[]> {
  const symbols = positions.map(p => p.symbol);
  const quotes = await batchGetRealtimeQuotes(symbols);

  return positions.map(pos => ({
    ...pos,
    realtimePrice: quotes[pos.symbol]?.price ?? pos.currentPrice,
    priceChangePercent: quotes[pos.symbol]?.changePercent ?? 0,
    lastQuoteUpdate: quotes[pos.symbol]?.timestamp,
    dataStaleness: calculateStaleness(quotes[pos.symbol]?.timestamp),
  }));
}
```

## 复杂性跟踪

| 违规 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 新增快照表 | 需要历史业绩对比 | 临时计算无法获取历史精确值 |
| 多阶段 AI 生成 | 提升内容质量 | 单次生成容易遗漏关键信息 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 实时 API 限流 | 高 | 批量请求 + 缓存策略 |
| 快照存储增长 | 中 | 定期清理策略（保留 1 年） |
| AI 生成超时 | 中 | 分阶段超时控制 |
| 数据不一致 | 低 | 事务封装 + 重试机制 |

## 性能考虑

- 数据聚合时间: < 10s
- AI 生成时间: < 45s
- 总生成时间: < 60s
- 实时行情缓存: 5 分钟

## 安全考虑

- API Key 安全存储（环境变量）
- 用户数据隔离（accountId 验证）
- 敏感数据不落日志

## 测试策略

- **单元测试**：
  - 业绩计算函数测试
  - 快照服务测试
  - 实时数据注入测试

- **集成测试**：
  - 完整报告生成流程测试
  - API 端点测试

- **端到端测试**：
  - 用户生成报告场景测试