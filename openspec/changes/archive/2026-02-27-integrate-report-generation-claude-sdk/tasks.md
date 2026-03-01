# 任务：报告生成集成 Claude Agent SDK

**输入**：来自 `/openspec/changes/integrate-report-generation-claude-sdk/plan.md` 的设计文档
**前置条件**：plan.md（已完成）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 单元测试：`pnpm test`
- 完整验证：`curl -X POST http://localhost:3000/api/report -d '{"accountId":"1","type":"weekly"}'`

**组织方式**：任务按实施阶段分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3）

## 路径约定

| 类型 | 路径 |
|------|------|
| Service | `src/server/service/reportService.ts` |
| Library | `src/server/lib/reportWorkspace.ts` |
| Types | `src/shared/types/claude-agent.ts` |

---

## 第0阶段：准备（设计与验证）

- [x] T001 创建变更目录结构 `openspec/changes/integrate-report-generation-claude-sdk/` <!-- id: 1 -->
- [x] T002 编写 proposal.md 描述变更意图和影响 <!-- id: 2 -->
- [x] T003 编写 plan.md 技术设计文档 <!-- id: 3 -->
- [x] T004 编写 spec delta 规范变更 <!-- id: 4 -->
- [x] T005 运行 `openspec validate integrate-report-generation-claude-sdk --strict` 验证 <!-- id: 5 -->

---

## 第1阶段：依赖和类型定义

**目的**：安装 SDK 依赖，定义类型

- [x] T006 添加 `@anthropic-ai/claude-agent-sdk` 依赖到 `package.json` <!-- id: 6 -->
- [x] T007 [P] 在 `src/server/service/reportService.ts` 中定义类型 <!-- id: 7 -->
  注：类型定义直接在 reportService.ts 中实现

**检查点**：依赖安装成功，类型定义完成

---

## 第2阶段：工作区管理器实现（P2）

**目的**：实现 ReportWorkspaceManager，负责工作区文件管理

- [x] T008 创建 `src/server/lib/reportWorkspace.ts` 文件 <!-- id: 8 -->
- [x] T009 实现 `ReportWorkspaceManager` 类的基础结构 <!-- id: 9 -->
  - `constructor()` - 初始化工作区根目录
  - `createWorkspace(reportId, reportData)` - 创建工作区
  - `cleanup(reportId)` - 清理工作区
- [x] T010 实现 `createWorkspace()` 方法 <!-- id: 10 -->
  - 创建 `temp/report-generation/{reportId}/` 目录
  - 写入 `context.md` 文件
  - 写入 `positions.json` 文件
  - 写入 `transactions.json` 文件
  - 写入 `notes.json` 文件
  - 写入 `market-events.json` 文件
- [x] T011 实现 `buildContextFile()` 方法 <!-- id: 11 -->
  - 复用 ReportService 的 `buildPerformanceSection()`
  - 复用 ReportService 的 `buildPositionsSection()`
  - 复用 ReportService 的 `buildDataSourceSection()`
  - 组装成 Markdown 格式
- [x] T012 实现 `cleanup()` 方法 <!-- id: 12 -->
  - 递归删除工作区目录
  - 添加错误处理（删除失败仅记录警告）
- [ ] T013 [P] 编写 ReportWorkspaceManager 单元测试 <!-- id: 13 -->
  - 测试工作区创建
  - 测试文件内容正确性
  - 测试清理功能

**检查点**：工作区管理器功能完整，测试通过

---

## 第3阶段：ReportService 改造（P1 - 核心）

**目的**：修改 `generateAIReportContent()` 使用 Claude Agent SDK，同时保留 LangChain 实现

### 3.1 模型配置提取

- [x] T014 在 `reportService.ts` 中实现 `getModelConfig()` 方法 <!-- id: 14 -->
  注：实现从 modelProviderResolver 获取模型配置

### 3.2 generateAIReportContent() 改造

- [x] T015 重构为支持双实现的架构 <!-- id: 15 -->
  - `generateAIReportContent()` - 根据 agentType 分发
  - `generateAIReportContentWithClaudeSDK()` - Claude Agent SDK 实现
  - `generateAIReportContentWithLangChain()` - LangChain 实现
- [x] T016 导入 Claude Agent SDK 和 ReportWorkspaceManager <!-- id: 16 -->
- [x] T017 实现新的 `generateAIReportContentWithClaudeSDK()` 方法 <!-- id: 17 -->
  - 生成唯一 reportId
  - 调用 `getModelConfig(modelSlug)` 获取配置
  - 调用 `workspaceManager.createWorkspace()` 创建工作区
  - 构建 Agent Prompt
  - 调用 `query()` 执行 Agent
  - 处理流式消息，提取最终结果
  - 在 `finally` 块中清理工作区
- [x] T018 配置 Agent Options <!-- id: 18 -->
- [x] T019 添加日志记录 <!-- id: 19 -->

### 3.3 前端支持 Agent 类型切换

- [x] T020 更新 `useReport.ts` 添加 `AgentType` 类型 <!-- id: 20 -->
- [x] T021 更新 `report-list.tsx` 添加 Agent 类型选择器 <!-- id: 21 -->
- [x] T022 更新 API 路由支持 `agentType` 参数 <!-- id: 22 -->
- [x] T023 更新 `ReportController` 传递 `agentType` 参数 <!-- id: 23 -->

**检查点**：核心功能实现完成，代码编译通过

---

## 第4阶段：测试验证

**目的**：确保功能正确性和质量

### 4.1 单元测试

- [ ] T024 [P] 编写 `getModelConfig()` 单元测试 <!-- id: 24 -->
  - 测试指定模型存在
  - 测试指定模型不存在回退到默认
  - 测试无模型配置抛出错误

### 4.2 集成测试

- [ ] T025 编写完整报告生成集成测试 <!-- id: 25 -->
  - Mock Claude Agent SDK
  - 验证工作区文件创建
  - 验证 Agent 调用参数
  - 验证工作区清理
  - 验证返回的报告内容格式

### 4.3 手动验证

- [ ] T026 启动开发服务器，测试报告生成 <!-- id: 26 -->
  ```bash
  pnpm dev
  # 在另一个终端
  curl -X POST http://localhost:3000/api/report \
    -H "Content-Type: application/json" \
    -d '{"accountId":"1","type":"weekly"}'
  ```
- [ ] T027 检查工作区目录是否正确创建和清理 <!-- id: 27 -->
  ```bash
  ls -la temp/report-generation/
  ```
- [ ] T028 验证生成的报告内容符合要求 <!-- id: 28 -->
  - 包含四个章节（概览、持仓分析、信息回顾、展望）
  - 格式为 Markdown
  - 数据准确（与输入数据一致）

### 4.4 质量对比测试（可选）

- [ ] T029 [P] 并行运行 LangChain 版本和 Claude Agent 版本 <!-- id: 29 -->
- [ ] T030 对比报告质量、准确性、可读性 <!-- id: 30 -->
- [ ] T031 对比执行时间和成本 <!-- id: 31 -->

**检查点**：所有测试通过，质量验证完成

---

## 第5阶段：完善与质量保证

**目的**：代码质量检查和文档更新

- [ ] T032 运行 `pnpm run lint` 并修复问题 <!-- id: 32 -->
- [x] T033 运行 `pnpm run types:check` 确保类型正确 <!-- id: 33 -->
- [ ] T034 运行 `pnpm test` 确保所有测试通过 <!-- id: 34 -->
- [ ] T035 添加代码注释和 JSDoc <!-- id: 35 -->
- [ ] T036 更新相关文档（如需要） <!-- id: 36 -->

---

## 第6阶段：归档准备

- [ ] T037 更新所有 TODO 状态为完成 <!-- id: 37 -->
- [ ] T038 验证所有场景在 spec.md 中已实现 <!-- id: 38 -->
- [ ] T039 运行最终验证 `openspec validate integrate-report-generation-claude-sdk --strict` <!-- id: 39 -->

---

## 依赖关系

### 阶段依赖

- **准备（第0阶段）**：立即进行 ✅
- **依赖和类型（第1阶段）**：依赖准备完成 ✅
- **工作区管理器（第2阶段）**：依赖第1阶段 ✅
- **ReportService 改造（第3阶段）**：依赖第1阶段和第2阶段 ✅
- **测试验证（第4阶段）**：依赖第3阶段
- **完善（第5阶段）**：依赖第4阶段
- **归档（第6阶段）**：依赖第5阶段

---

## 回退计划

如果集成失败或效果不佳：

1. **代码回退**：
   - 前端选择 `langchain` 即可切换回原有实现
   - 删除 `src/server/lib/reportWorkspace.ts`
   - 移除 `@anthropic-ai/claude-agent-sdk` 依赖
2. **无数据影响**：数据库结构未变更，无需数据迁移
3. **无 API 影响**：API 接口未变更，前端无感知

---

## 验收标准

- ✅ 所有任务完成并标记为 `[x]`
- ✅ `pnpm run types:check` 无错误
- [ ] `pnpm run lint` 无错误
- [ ] `pnpm test` 所有测试通过
- [ ] `openspec validate --strict` 验证通过
- [ ] 手动测试：POST `/api/report` 返回正确的报告内容
- [ ] 工作区在生成后正确清理
- [ ] 前端可切换 Claude SDK 和 LangChain 两种实现