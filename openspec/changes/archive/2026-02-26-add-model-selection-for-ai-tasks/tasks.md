# 任务：为 AI 任务添加模型选择功能

**输入**：来自 `/openspec/changes/add-model-selection-for-ai-tasks/plan.md` 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 单元测试：`pnpm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2）

## 路径约定

| 类型 | 路径 |
|------|------|
| API Routes | `src/app/api/[capability]/route.ts` |
| Service | `src/server/service/[capability]Service.ts` |
| Components | `src/app/(pages)/[feature]/components/` |

---

## 第0阶段：准备（设计与验证）

- [x] T00 创建变更目录结构 `openspec/changes/add-model-selection-for-ai-tasks/` <!-- id: 0 -->
- [x] T01 编写 proposal.md 描述变更意图和影响 <!-- id: 1 -->
- [x] T02 编写 plan.md 技术设计文档 <!-- id: 2 -->
- [x] T03 编写 spec delta 规范变更 <!-- id: 3 -->
- [x] T04 运行 `openspec validate add-model-selection-for-ai-tasks --strict` 验证 <!-- id: 4 -->

---

## 第1阶段：设置（基础设施）

**目的**：扩展类型定义和验证 schema

- [ ] T05 [P] 扩展 `src/server/controller/market.ts` 的 `SummarizeContentRequestSchema` 添加可选的 `modelSlug` 字段 <!-- id: 5 -->
- [ ] T06 [P] 扩展 `src/server/controller/report.ts` 的请求 Schema 添加可选的 `modelSlug` 字段（如需要） <!-- id: 6 -->

---

## 第2阶段：基础（服务层）

**目的**：核心业务逻辑修改，必须在 UI 前完成

**⚠️ 关键**：此阶段完成前不应开始 UI 工作

- [ ] T07 修改 `src/server/service/marketAIService.ts` - `create()` 方法支持 `modelSlug` 参数 <!-- id: 7 -->
- [ ] T08 [P] 修改 `src/server/service/reportService.ts` - `generateAIReportContent()` 方法支持 `modelSlug` 参数 <!-- id: 8 -->
- [ ] T09 [P] 修改 `src/server/controller/market.ts` - `analyzeContent()` 方法传递 `modelSlug` 到服务层 <!-- id: 9 -->
- [ ] T10 [P] 修改 `src/server/controller/report.ts` - 报告生成接口传递 `modelSlug` 到服务层 <!-- id: 10 -->
- [ ] T11 编写服务层单元测试（可选） <!-- id: 11 -->

**检查点**：服务层支持 modelSlug 参数，API 接口准备就绪

---

## 第3阶段：API

- [ ] T12 修改 `src/app/api/market-fetcher/ai/route.ts` - 在请求体中接受 `modelSlug` 参数 <!-- id: 12 -->
- [ ] T13 [P] 修改 `src/app/api/report/route.ts` - 在请求体中接受 `modelSlug` 参数 <!-- id: 13 -->

---

## 第4阶段：User Story 1 - 市场信息 AI 分析模型选择 (优先级：P1) 🎯 MVP

**目标**：在 StepTwoAIAnalyzer 组件中添加模型选择功能
**独立测试**：在市场信息获取页面，选择不同模型进行 AI 分析

### 实现

- [ ] T14 [US1] 修改 `StepTwoAIAnalyzer.tsx` - 添加模型选择状态管理 <!-- id: 14 -->
- [ ] T15 [US1] 修改 `StepTwoAIAnalyzer.tsx` - 调用 `GET /api/model-providers/models/available` 获取可用模型 <!-- id: 15 -->
- [ ] T16 [US1] 修改 `StepTwoAIAnalyzer.tsx` - 渲染模型选择下拉框（使用 Ant Design Select） <!-- id: 16 -->
- [ ] T17 [US1] 修改 `StepTwoAIAnalyzer.tsx` - 在 `handleAnalyze` 中传递选中的 `modelSlug` 到 API <!-- id: 17 -->
- [ ] T18 [US1] 验证默认模型正确显示并选中 <!-- id: 18 -->
- [ ] T19 [US1] 添加 i18n 国际化文案 <!-- id: 19 -->

**检查点**：US1 功能完整可用 - 市场信息 AI 分析可选择模型

---

## 第5阶段：User Story 2 - 投资报告生成模型选择 (优先级：P2)

**目标**：在报告生成页面添加模型选择功能
**独立测试**：在报告生成页面，选择不同模型生成投资报告

### 实现

- [ ] T20 [US2] 确定报告生成页面的模型选择 UI 位置（新建按钮或生成报告弹窗） <!-- id: 20 -->
- [ ] T21 [US2] 在报告生成流程中添加模型选择状态 <!-- id: 21 -->
- [ ] T22 [US2] 修改报告生成 API 调用，传递 `modelSlug` 参数 <!-- id: 22 -->
- [ ] T23 [US2] 添加 i18n 国际化文案 <!-- id: 23 -->

**检查点**：US2 功能完整可用 - 投资报告生成可选择模型

---

## 第6阶段：完善与质量保证

**目的**：跨功能的改进和质量检查

- [ ] T24 运行 `pnpm run lint` 并修复问题 <!-- id: 24 -->
- [ ] T25 运行 `pnpm run types:check` 确保类型正确 <!-- id: 25 -->
- [ ] T26 运行 `pnpm test` 确保测试通过 <!-- id: 26 -->

---

## 第7阶段：归档准备

- [ ] T27 更新所有 TODO 状态为完成 <!-- id: 27 -->
- [ ] T28 验证所有场景在 spec.md 中已实现 <!-- id: 28 -->

---

## 依赖关系

### 阶段依赖

- **准备（第0阶段）**：立即进行
- **设置（第1阶段）**：依赖准备完成
- **基础（第2阶段）**：依赖设置 - 阻塞 API/UI
- **API（第3阶段）**：依赖基础阶段
- **User Stories**：依赖 API 和基础阶段
- **完善**：依赖期望的 US 完成

### 并行机会

- T05 和 T06 可并行（不同 Controller 文件）
- T07 和 T08 可并行（不同 Service 文件）
- T09 和 T10 可并行（不同 Controller 文件）
- T12 和 T13 可并行（不同 API 路由文件）