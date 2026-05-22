# 实现计划：Agent 评测框架

**分支**：`add-agent-evaluation` | **日期**：2026-05-14 | **规范**：[spec.md](./specs/agent-evaluation/spec.md)
**输入**：来自 `/specs/agent-evaluation/spec.md` 的功能规范

## 概要

基于 @mastra/evals 构建投资 Agent 评测框架，采用 MACEE 五维评测模型（Mission, Action, Context, Execution, Ethics），提供：
- 集成 @mastra/evals 的 11 个 LLM 评分器和 6 个代码评分器
- 投资领域特定的 4 个自定义评分器
- 覆盖 5 大类别的 100 个 MVP 基准测试用例
- **统一的 `pnpm eval` CLI 入口，同时支持交互式模式和命令行参数模式**（适应日常开发和 CI/CD）
- CI/CD 集成的自动化评测流水线
- 多引擎对比和回归检测能力

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：
- @mastra/evals（核心评测引擎）
- @mastra/core/llm（模型配置）
- @mastra/core（@mastra/evals peer dependency）
- 现有 model-provider（LLM-as-Judge 模型）
- 现有 Hermes 可观测性（追踪数据源）
- commander / inquirer（CLI 框架）

**存储**：SQLite (prod) - 复用现有数据库
**测试**：Vitest
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)

**性能目标**：
- 单个评分器评测 < 5s
- 完整评测套件 < 30min
- 报告生成 < 10s

**约束条件**：
- 必须兼容现有的 Agent 系统（DeepAgents、Claude、Hermes）
- LLM-as-Judge 使用项目已有的模型提供者配置
- 评测过程不阻塞生产服务
- CLI 必须同时支持交互模式和命令行参数模式

## 规范检查

- [x] 符合项目规范（TypeScript、Next.js、Drizzle ORM）
- [x] TypeScript 严格模式约束
- [x] OpenSpec delta 格式正确

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-agent-evaluation/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── agent-evaluation/    # agent-evaluation capability
        └── spec.md          # Delta 变更
```

### 源代码（项目根目录）

```text
evaluation/
├── cli/                     # CLI 入口（统一交互式 + 命令行）
│   ├── index.ts             # 主入口，模式检测和路由
│   ├── interactive.ts       # 交互式菜单
│   ├── commands/            # 命令处理器
│   │   ├── full.ts          # 完整评测
│   │   ├── category.ts      # 类别评测
│   │   ├── compare.ts       # 引擎对比
│   │   ├── regression.ts    # 回归测试
│   │   └── replay.ts        # 会话回放
│   └── config.ts            # 配置文件处理
├── core/                    # 核心评测引擎
│   ├── index.ts             # 导出入口
│   ├── evaluator.ts         # MACEE 评测器
│   ├── scorer-registry.ts   # 评分器注册表
│   └── types.ts             # 类型定义
├── scorers/                 # 自定义评分器
│   ├── index.ts             # 导出入口
│   ├── risk-disclosure.ts   # 风险披露检查
│   ├── prohibited-words.ts  # 禁止用语检测
│   ├── data-accuracy.ts     # 数据准确性
│   └── advice-quality.ts    # 投资建议质量
├── adapters/                # 数据格式适配器
│   ├── index.ts             # 导出入口
│   ├── hermes.ts            # Hermes 追踪适配
│   ├── deepagents.ts        # DeepAgents 追踪适配
│   └── claude.ts            # Claude Agent SDK 适配
├── benchmarks/              # 基准测试数据集
│   ├── asset-query/         # 资产查询（20 cases）
│   ├── portfolio-analysis/  # 投资组合分析（20 cases）
│   ├── market-research/     # 市场研究（25 cases）
│   ├── multi-turn/          # 多轮推理（20 cases）
│   ├── edge-cases/          # 边缘案例（15 cases）
│   └── schema.json          # 测试用例 Schema
├── pipelines/               # 评测流水线
│   ├── runner.ts            # 评测运行器
│   ├── comparator.ts        # 引擎对比器
│   └── regression.ts        # 回归检测器
├── reporters/               # 报告生成器
│   ├── json.ts              # JSON 报告
│   ├── markdown.ts          # Markdown 报告
│   └── html.ts              # HTML 可视化报告
└── evaluation.config.ts     # 默认配置文件
```

**结构决策**：
- 采用独立 `evaluation/` 目录，与业务代码隔离
- 统一 CLI 入口 `cli/index.ts`，检测运行模式并路由到对应处理器
- 适配器模式处理多引擎追踪数据，便于扩展新引擎
- 基准测试采用 JSONL 格式，便于版本控制和增量更新
- 支持配置文件 `evaluation.config.ts` 持久化常用配置

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 作为开发者，我可以运行 `pnpm eval` 进入交互式评测界面 | 显示菜单并引导完成评测 |
| P1 | 作为开发者，我可以在 CI 中用 `pnpm eval --full --ci` 自动运行评测 | CI 环境自动执行并返回正确退出码 |
| P1 | 作为开发者，我可以用 @mastra/evals 评分器评测单个 Agent 运行 | 运行单个评分器并得到 0-1 分数 |
| P1 | 作为开发者，我可以运行基准测试套件并获得 MACEE 分数 | `pnpm eval --full` 返回完整报告 |
| P2 | 作为开发者，我可以对比多引擎性能 | `pnpm eval --compare deepagents,claude` 生成对比矩阵 |
| P2 | 作为开发者，我可以添加投资领域自定义评分器 | 风险披露检查器返回有效评分 |
| P2 | 作为开发者，我可以通过配置文件持久化评测设置 | `evaluation.config.ts` 生效并可被参数覆盖 |
| P3 | 作为开发者，我可以回放历史会话进行回归测试 | `pnpm eval --replay <session-id>` 对比历史和当前响应 |
| P3 | 作为开发者，我可以生成可视化评测报告 | HTML 报告包含交互式图表 |

## 技术架构

### CLI 架构
```
                    ┌─────────────────────────┐
                    │     pnpm eval           │
                    └─────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              有参数？              无参数
                    │                   │
                    ▼                   ▼
            ┌───────────────┐   ┌───────────────┐
            │ 命令行参数模式  │   │  交互式菜单   │
            └───────────────┘   └───────────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │   Command Handlers      │
                    ├─────────────────────────┤
                    │ • full                  │
                    │ • category              │
                    │ • compare               │
                    │ • regression            │
                    │ • replay                │
                    └─────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │     Evaluator Engine    │
                    └─────────────────────────┘
```

### 数据流
```
[Agent Run] → [Engine Event Capture] → [EvaluationRunRecord] → [Mastra Adapter]
                                                                 ↓
[Report] ← [Aggregator] ← [Scorers] ← [Evaluator] ← [Mastra Format]
                ↓
           [MACEE Score]
```

### 评分器架构
```
                    ┌─────────────────────────┐
                    │     MACEE Evaluator     │
                    └─────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ @mastra/evals │   │ Custom Scorers│   │  Aggregators  │
├───────────────┤   ├───────────────┤   └───────────────┘
│ Tool Call Acc │   │ Risk Disclosure│
│ Trajectory    │   │ Prohibited Words│
│ Faithfulness  │   │ Data Accuracy  │
│ Answer Rel.   │   │ Advice Quality │
│ Context Rel.  │   └───────────────┘
│ Toxicity      │
│ Bias          │
│ Hallucination │
│ ...           │
└───────────────┘
```

### 状态管理
- **服务端**: 评测任务状态（pending、running、completed、failed）
- **客户端**: 无状态，所有状态存储在数据库
- **缓存策略**: 评测结果缓存 7 天，基准测试数据版本化管理
- **配置管理**: `evaluation.config.ts` 存储默认配置，命令行参数可覆盖

### 数据合同

`EvaluationRunRecord` 是评测系统的内部标准输入。所有 Agent 引擎先转换到该结构，再由 Mastra adapter 转换成 scorer 输入：

- `id`, `caseId`, `engine`, `agentId`, `startedAt`, `completedAt`, `status`
- `input`: 用户输入或多轮输入
- `output`: Agent 最终响应
- `messages`: 规范化消息序列
- `toolCalls`: 工具名、参数、结果、耗时、错误状态
- `trace`: 可选 trace/span/metric 事件
- `cost`: token、费用、模型和延迟统计
- `error`: 失败原因和可恢复性标记

数据库至少需要保存评测运行、单用例结果、scorer 结果、聚合报告和基线引用。P1 必须提供 schema 与迁移，缓存 7 天作为结果复用策略，基线结果长期保留用于回归比较。

### 外部集成
- **@mastra/evals**: 评分器核心实现
- **Hermes**: 追踪数据获取
- **model-provider**: LLM-as-Judge 模型配置
- **Drizzle ORM**: 结果持久化
- **commander**: CLI 参数解析
- **inquirer**: 交互式菜单

## 复杂性跟踪

| 违规 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 引入 @mastra/evals 外部依赖 | 提供完整的 LLM 评测工具集，包括工具调用和轨迹评测 | 从零构建需要大量开发时间，且缺乏社区验证 |
| 多适配器模式 | 支持三种不同 Agent 引擎的追踪数据格式 | 单一适配器无法处理三种格式差异 |
| 统一 CLI 入口 + 双模式 | 同时满足交互开发体验和 CI/CD 自动化需求 | 分开实现导致代码重复和维护成本高 |
| EvaluationRunRecord 中间层 | 现有 Hermes 只稳定暴露摘要，三引擎 trace 格式也不一致 | 直接把各引擎映射到 Mastra 会让 adapter 与具体 SDK 强耦合，难以回归和持久化 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| @mastra/evals API 变更 | 高 | 锁定版本，监控 changelog，抽象层隔离 |
| LLM-as-Judge 成本 | 中 | 缓存评测结果，使用较小模型（gpt-4o-mini）进行评测 |
| 评测结果不一致 | 中 | 多次评测取平均，设置置信区间 |
| 追踪数据格式变化 | 中 | 适配器版本化管理，格式验证 |
| CLI 交互在 CI 中阻塞 | 高 | 自动检测 CI 环境，禁用交互模式 |
| @mastra/evals 使用方式与文档不一致 | 中 | P1 先完成最小 API spike，封装本项目内部 scorer wrapper |

## 性能考虑

- 单个评分器评测: < 5s（LLM 调用）
- 完整评测套件: < 30min（并行运行）
- 报告生成: < 10s
- 数据库写入: 批量写入，减少 I/O
- CLI 启动: < 1s（快速反馈）

## 安全考虑

- LLM-as-Judge 调用使用现有模型配置，遵循现有安全策略
- 评测数据可能包含敏感信息，需要在隔离环境运行
- 评测报告不包含用户 PII，脱敏后再存储
- CI 环境下不显示敏感配置

## 测试策略

- **单元测试**: 
  - 适配器数据转换正确性
  - 自定义评分器逻辑
  - 聚合计算正确性
  - CLI 参数解析和模式检测
- **集成测试**: 
  - @mastra/evals 评分器集成
  - 完整评测流水线
  - 多引擎对比
  - CI/CD 流水线
- **端到端测试**: 
  - 交互式 CLI 流程
  - 命令行参数模式
  - 真实 Agent 运行评测

## 实施路径

### 第一阶段（第 1-2 周）
目标：建立基础设施，集成 @mastra/evals

1. 安装 @mastra/evals，配置模型
2. 实现统一 CLI 入口框架（交互式 + 参数模式）
3. 实现三个引擎的数据适配器
4. 集成核心 5 个评分器
5. 创建评测运行器
6. 生成基础 JSON 报告

### 第二阶段（第 3-4 周）
目标：自定义评分器，测试数据集

1. 实现 4 个投资领域自定义评分器
2. 创建 100+ 基准测试用例
3. 实现 CI/CD 集成（非交互模式）
4. 添加回归检测
5. 多引擎对比功能
6. 配置文件支持

### 第三阶段（第 5-8 周）
目标：高级功能，可视化

1. 会话回放评测
2. 在线评测指标收集
3. HTML 可视化报告
4. 完整 CLI 工具集（帮助、版本、状态显示）
5. 文档和指南
