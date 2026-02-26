# 实现计划：为 AI 任务添加模型选择功能

**分支**：`add-model-selection-for-ai-tasks` | **日期**：2026-02-26 | **规范**：`openspec/changes/add-model-selection-for-ai-tasks/`
**输入**：用户需求 - 在市场信息 AI 分析和投资报告生成时支持选择模型

## 概要

在市场信息 AI 分析（StepTwoAIAnalyzer）和投资报告生成两个场景中，新增模型选择功能。用户可以在执行 AI 任务前选择要使用的模型，默认使用账户配置的默认模型。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, LangChain.js, Ant Design
**存储**：SQLite (prod)
**测试**：Vitest
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：模型列表加载 < 500ms，UI 响应 < 100ms
**约束条件**：`modelSlug` 参数可选，确保向后兼容

## 规范检查

- [x] 符合 Controller/Service 分层规范
- [x] TypeScript 严格模式约束
- [x] 使用 Zod 进行参数验证
- [x] 复用现有 API `/api/model-providers/models/available`

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-model-selection-for-ai-tasks/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    ├── asset-market-info/   # 市场信息相关 spec delta
    │   └── spec.md
    └── report-generation/   # 报告生成相关 spec delta
        └── spec.md
```

### 源代码（项目根目录）

```text
src/
├── app/
│   ├── api/
│   │   ├── market-fetcher/ai/route.ts   # 需修改：接受 modelSlug
│   │   └── report/route.ts              # 需修改：接受 modelSlug
│   └── (pages)/
│       ├── asset-market-info-fetcher/components/
│       │   └── StepTwoAIAnalyzer.tsx    # 需修改：添加模型选择
│       └── report/                       # 需修改：添加模型选择
├── server/
│   ├── controller/
│   │   ├── market.ts                    # 需修改：传递 modelSlug
│   │   └── report.ts                    # 需修改：传递 modelSlug
│   └── service/
│       ├── marketAIService.ts           # 需修改：接受 modelSlug
│       └── reportService.ts             # 需修改：接受 modelSlug
└── components/
    └── ui/                               # 复用现有 UI 组件
```

**结构决策**：复用现有 `GET /api/model-providers/models/available` API 获取可用模型列表，无需新增 API。

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 市场信息 AI 分析可选择模型 | 在 StepTwoAIAnalyzer 中选择模型并分析 |
| P2 | 投资报告生成可选择模型 | 在报告生成页面选择模型并生成报告 |

## 技术架构

### 数据流

```
[前端组件] → [获取可用模型 GET /api/model-providers/models/available]
     ↓
[用户选择模型] → [调用 AI 接口] → [API Route] → [Controller] → [Service]
                                                            ↓
                                                      [chatModelOpenAI(modelSlug)]
                                                            ↓
                                                      [LangChain 调用]
```

### 状态管理

- **服务端**: 无新增状态
- **客户端**: 模型选择状态仅保存在组件局部状态
- **缓存策略**: 可用模型列表可考虑 React Query 或 SWR 缓存（本次实现可简化为组件内状态）

### 关键设计决策

1. **ModelSelector 组件**：可复用项目现有的 Select 组件（Ant Design），无需新建独立组件
2. **默认模型获取**：利用现有 `modelProviderResolver.getDefaultModelSlug()` 获取默认模型
3. **API 修改**：保持向后兼容，`modelSlug` 参数为可选

## 复杂性跟踪

> 无规范违规，无需记录

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 模型不可用 | 低 | 使用 fallback 到默认模型，记录警告日志 |
| API 参数验证失败 | 低 | Zod schema 定义可选的 modelSlug 字段 |
| 前端加载模型列表失败 | 低 | 显示错误提示，使用默认模型 |

## 性能考虑

- 模型列表加载: < 500ms（数据库查询已优化）
- UI 响应: < 100ms（本地状态管理）
- 无额外数据库查询开销

## 安全考虑

- modelSlug 由后端验证（必须是用户配置的可用模型）
- 不可通过 API 指定未配置的模型（会 fallback 到默认模型）

## 测试策略

- **单元测试**: Service 层支持 modelSlug 参数的测试
- **集成测试**: API 接受 modelSlug 并正确传递的测试
- **手动测试**: 前端选择模型并验证后端使用了正确模型（通过日志）