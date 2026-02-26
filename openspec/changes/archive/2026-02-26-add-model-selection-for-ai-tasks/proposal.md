# Change: 为 AI 任务添加模型选择功能

## Why

当前系统中，市场信息 AI 分析和投资报告生成功能都使用用户的默认模型，无法在执行时选择特定的模型。用户希望能够根据任务需求选择不同的模型（例如，某些模型更适合分析、某些更适合生成报告）。

## What Changes

- **市场信息 AI 分析**：在 `StepTwoAIAnalyzer` 组件中添加模型选择器，允许用户在分析前选择要使用的模型
- **投资报告生成**：在报告生成页面添加模型选择器，允许用户在生成报告前选择要使用的模型
- **默认行为**：默认选中用户配置的默认模型，用户可自由切换

### 技术变更点

1. **前端组件**：
   - 新增 `ModelSelector` 通用组件（或复用现有组件）
   - 在 `StepTwoAIAnalyzer` 中集成模型选择器
   - 在报告生成页面中集成模型选择器

2. **API 层**：
   - `PUT /api/market-fetcher/ai` 接受可选的 `modelSlug` 参数
   - `POST /api/report` 接受可选的 `modelSlug` 参数

3. **服务层**：
   - `MarketAIService.create(modelSlug?)` 支持传入模型标识
   - `ReportService.generateAIReportContent(modelSlug?)` 支持传入模型标识

## Impact

- **影响的规范**：
  - `asset-market-info` - 市场信息 AI 分析步骤新增模型选择能力
  - `report-generation` - 报告生成流程新增模型选择能力

- **影响的代码**：
  - `src/app/(pages)/asset-market-info-fetcher/components/StepTwoAIAnalyzer.tsx`
  - `src/app/(pages)/report/` 相关页面
  - `src/app/api/market-fetcher/ai/route.ts`
  - `src/app/api/report/route.ts`
  - `src/server/controller/market.ts`
  - `src/server/controller/report.ts`
  - `src/server/service/marketAIService.ts`
  - `src/server/service/reportService.ts`

- **向后兼容**：完全兼容，`modelSlug` 参数为可选，默认使用原逻辑