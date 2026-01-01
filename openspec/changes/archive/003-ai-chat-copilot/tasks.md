---
description: 'Task list for AI 决策对话功能 implementation'
---

# Tasks: AI 决策对话功能 (003-ai-ai)

**Input**: Design documents from `/specs/003-ai-ai/` **Prerequisites**: plan.md
(required), spec.md (required), data-model.md (available),
contracts/chat-api.yaml (available), quickstart.md (available)

**Feature Name**: AI 决策对话功能 - 基于CopilotKit+LangGraph升级 **Feature
Branch**: 003-ai-ai **Tests**: Not explicitly requested in specification -
focusing on implementation tasks

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 项目初始化和基础结构验证

- [x] T001 [P] [Setup] 验证现有 CopilotKit React UI
      (`@copilotkit/react-ui`) 和 CopilotSidebar 集成现状
- [x] T002 [Setup] 验证现有LangGraph工作流引擎架构
- [x] T003 [P] [Setup] 验证现有 /api/copilotkit 端点配置和SSE实现

**Checkpoint**: Setup complete - foundation ready for foundational phase

---

## Phase 2: User Story 1 - 基本投资咨询对话 (Priority: P1) 🎯 MVP

**Goal**: 用户可以用日常语言向AI助手询问基础投资问题并获得专业解答

**Independent
Test**: 通过独立对话测试环境，输入"请问特斯拉股票现在怎么样？"验证基本对话功能

### Implementation for User Story 1

- [x] T004 [P] [US1] 在现有
      [`src/app/api/copilotkit/route.ts`](src/app/api/copilotkit/route.ts:1)
      中集成投资对话图节点
- [x] T005 [P] [US1] 创建投资咨询代理状态模型
- [x] T006 [P] [US1] 更新 CopilotKit 配置以使用新的投资咨询图
- [x] T007 [US1] 在聊天页面中集成 CopilotKit 对话组件
- [x] T008 [US1] 验证基本投资咨询对话功能

**Checkpoint**: At this point, User Story 1 should be fully functional and
testable independently

---

## Phase 3: User Story 2 - 个性化投资建议对话 (Priority: P2)

**Goal**: 基于用户持仓情况、风险偏好、投资目标，AI能够提供个人化的投资建议

**Independent
Test**: 创建模拟用户档案，验证AI是否能根据假设的风险承受能力给出相应投资建议

### Implementation for User Story 2

- [x] T009 [P] [US2] 在 investmentChatGraph 中扩展个性化逻辑
- [x] T010 [P] [US2] 创建用户上下文数据读取器
- [x] T011 [US2] 集成用户持仓数据到对话上下文
- [x] T012 [US2] 验证个性化投资建议功能

**Checkpoint**: At this point, User Stories 1 AND 2 should both work
independently

---

## Phase 4: User Story 3 - 复杂策略讨论对话 (Priority: P3)

**Goal**: 用户可以与AI深入探讨复杂的投资策略如何运作、适用场景、风险收益特征等

**Independent Test**: 通过要求AI解释一个期权策略来验证其教育能力

### Implementation for User Story 3

- [ ] T013 [P] [US3] 创建复杂投资策略知识库
- [ ] T014 [P] [US3] 扩展现有代理网络以支持策略解释
- [ ] T015 [US3] 集成教育内容到对话流程中
- [ ] T016 [US3] 验证复杂策略讨论功能

**Checkpoint**: All user stories should now be independently functional

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion
- **User Story 2 (Phase 3)**: Can start after User Story 1 is complete
- **User Story 3 (Phase 4)**: Can start after User Story 2 is complete

### Parallel Opportunities

- T004、T005 和 T006 可以并行执行
- T009 和 T010 可以并行执行
- T013 和 T014 可以并行执行

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1
3. **STOP and VALIDATE**: 独立测试用户故事1功能

### Incremental Delivery

1. Complete Setup → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo

---

## Notes

- 复用现有CopilotKit+LangGraph架构 - 零重复开发
- 直接接入现有6个专业代理（分析师/研究员/评估员/交易员）
- 集成现有Finnhub数据链路和AssetService用户持仓数据
- 所有操作基于现有已验证的技术栈
- 用户上下文信息通过useCopilotReadable自动传递
- 状态管理通过CopilotKit原生记忆+LangGraph会话追踪
