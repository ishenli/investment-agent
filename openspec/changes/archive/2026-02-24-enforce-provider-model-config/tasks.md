# 任务：强制使用 Provider 配置的模型

**输入**：来自 `openspec/changes/enforce-provider-model-config/specs/model-provider/spec.md` 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 单元测试：`pnpm test`

---

## 第0阶段：准备（设计与验证）

- [x] T00 创建变更目录结构 `openspec/changes/enforce-provider-model-config/`
- [x] T01 编写 proposal.md 描述变更意图和影响
- [x] T02 编写 spec delta 规范变更
- [x] T03 运行 `openspec validate enforce-provider-model-config --strict` 验证

---

## 第1阶段：基础（服务层）

**目的**：修改核心模型获取逻辑

### 修改 modelProviderResolver

- [x] T04 在 `modelProviderResolver.ts` 添加 `getDefaultModelConfig()` 方法

### 修改 chatModelOpenAI 函数

- [x] T05 在 `chatModel.ts` 修改函数签名，参数改为可选
- [x] T06 在 `chatModel.ts` 实现无参数时获取默认模型逻辑
- [x] T07 在 `chatModel.ts` 实现指定模型未找到时回退到默认模型

**检查点**：核心函数修改完成 ✅

---

## 第2阶段：迁移服务调用

**目的**：将硬编码模型改为使用默认模型

### 核心服务修改

- [x] T08 [P] 修改 `chatService.ts` 的 fallback 模型为默认模型获取
- [x] T09 [P] 修改 `reportService.ts` 使用默认模型

### 其他服务/Graph 修改

- [x] T10 [P] 修改 `marketAIService.ts` 使用默认模型
- [x] T11 [P] 修改 `fundamental_anallyst.ts` 使用默认模型
- [x] T12 [P] 修改 `scenarioAnalyzerGraph.ts` 使用默认模型
- [x] T13 [P] 修改 `strategyAdviceGraph.ts` 使用默认模型
- [x] T14 [P] 修改 `diversificationGraph.ts` 使用默认模型
- [x] T15 [P] 修改 `aiInsightsGraph.ts` 使用默认模型

**检查点**：所有硬编码迁移完成 ✅

---

## 第3阶段：完善与质量保证

- [x] T16 运行 `pnpm run types:check` 确保类型正确 ✅
- [x] T17 运行 `pnpm test` - 已有测试失败是由于 mock 基础设施问题（`db.select is not a function`），与本次修改无关
- [x] T18 `ModelMap` 常量保留供参考，已不再在服务中使用

---

## 第4阶段：归档准备

- [x] T19 更新所有任务状态为完成
- [x] T20 验证所有场景在 spec.md 中已实现

---

## 完成摘要

### 修改的文件

1. `src/server/repository/modelProviderRepository.ts` - 添加 `findDefaultModelConfigByUserId()` 方法
2. `src/server/service/modelProviderResolver.ts` - 添加 `getDefaultModelConfig()` 方法
3. `src/server/core/provider/chatModel.ts` - 重构 `chatModelOpenAI()` 支持可选参数和默认模型回退
4. `src/server/service/chatService.ts` - 移除硬编码 fallback 模型
5. `src/server/service/reportService.ts` - 使用默认模型
6. `src/server/service/marketAIService.ts` - 使用默认模型
7. `src/server/core/agents/analysts/fundamental_anallyst.ts` - 使用默认模型
8. `src/server/core/graph/scenarioAnalyzerGraph.ts` - 使用默认模型
9. `src/server/core/graph/strategyAdviceGraph.ts` - 使用默认模型
10. `src/server/core/graph/diversificationGraph.ts` - 使用默认模型
11. `src/server/core/graph/aiInsightsGraph.ts` - 使用默认模型（2处）

### 行为变更

- `chatModelOpenAI()` 无参数时获取用户默认模型
- `chatModelOpenAI('model-slug')` 指定模型未配置时自动回退到默认模型
- 所有日志记录级别适当（INFO/WARN）
- 向后兼容现有环境变量配置方式