# 任务：AI 仓位管理器

**输入**: 来自 `/specs/ai-position-manager/` 的设计文档 **先决条件**: plan.md (必需), spec.md (用户故事必需), research.md, data-model.md, contracts/

**组织**: 任务按用户故事分组，以便每个故事可以独立实现和测试。

## 格式: `[ID] [P?] [Story] 描述`

- **[P]**: 可以并行运行（不同文件，无依赖关系）
- **[Story]**: 此任务属于哪个用户故事（例如，US1, US2, US3）
- 在描述中包含确切的文件路径

## 路径约定

- **Web 应用**: `src/app/` 用于前端组件, `src/app/api/` 用于 API 路由
- **状态管理**: `src/app/store/` 用于 Zustand 存储
- **组件**: `src/app/components/` 用于可重用组件

## 阶段 1: 设置 (共享基础设施)

**目的**: 项目初始化和基本结构

- [x] T001 根据实施计划创建项目结构
- [x] T005 [P] 配置 Recharts 库用于金融数据可视化
- [x] T006 [P] 在现有的 position-management.tsx 实现相关的UI功能
---

## 阶段 2: 基础 (阻塞性先决条件)

**目的**: 在实现任何用户故事之前必须完成的核心基础设施

**⚠️ 关键**: 在此阶段完成之前，不能开始任何用户故事的工作

- [x] T006 设置 Sqlite 模式和本地存储框架
- [x] T008 [P] 为仓位管理设置 API 路由和中间件结构
- [x] T009 创建所有故事都依赖的基础模型/实体 (PositionAsset, Portfolio)
- [x] T010 配置错误处理和日志基础设施

**检查点**: 基础就绪 - 现在可以并行开始用户故事实现

---

## 阶段 3: 用户故事 1 - 查看实时仓位洞察 (优先级: P1) 🎯 MVP

**目标**: 使零售投资者能够查看其投资组合的实时风险洞察

**独立测试**: 通过模拟仓位数据和实时市场数据可以测试仪表盘显示功能

### 用户故事 1 的实现

- [x] T013 [P] [US1] 在 src/app/store/position/types.ts 中创建 PositionAsset 模型
- [x] T014 [P] [US1] 在 src/app/store/position/types.ts 中创建 Portfolio 模型
- [x] T015 [P] [US1] 在 src/app/store/position/types.ts 中创建 RiskInsights 模型
- [x] T016 [US1] 在 src/app/store/position/store.ts 中实现 PositionStore (依赖 T013, T014, T015)
- [x] T017 [P] [US1] 在 src/app/components/position-manager/RiskDashboard.tsx 中创建 RiskDashboard 组件
- [x] T018 [P] [US1] 在 src/app/components/position-manager/ConcentrationChart.tsx 中创建 ConcentrationChart 组件
- [x] T019 [P] [US1] 在 src/app/components/position-manager/AllocationChart.tsx 中创建 AllocationChart 组件
- [x] T020 [P] [US1] 在 src/app/components/position-manager/CorrelationHeatmap.tsx 中创建 CorrelationHeatmap 组件
- [x] T021 [P] [US1] 在 src/app/components/position-manager/LiquidityChart.tsx 中创建 LiquidityChart 组件
- [x] T022 [US1] 在 src/app/services/position/riskCalculator.ts 中实现风险计算服务
- [x] T023 [US1] 在 src/app/api/position/route.ts 中创建仓位 API 路由
- [x] T024 [US1] 为风险计算添加验证和错误处理
- [x] T025 [US1] 为用户故事 1 操作添加日志记录
- [x] T026 [US1] 与现有的资产管理模块集成以获取仓位数据

**检查点**: 此时，用户故事 1 应该完全功能化并且可以独立测试

---

## 阶段 4: 用户故事 2 - 切换风险评估模式 (优先级: P2)

**目标**: 使投资者能够在风险评估模式（散户模式/进阶模式）之间切换

**独立测试**: 通过切换模式并验证相关阈值和显示内容的变化可以测试此功能

### 用户故事 2 的实现

- [x] T027 [P] [US2] 在 src/app/store/position/types.ts 中创建 RiskMode 模型
- [x] T028 [US2] 在 src/app/store/position/store.ts 中扩展 PositionStore 添加风险模式功能
- [x] T029 [P] [US2] 在 src/app/components/position-manager/RiskModeSelector.tsx 中创建 RiskModeSelector 组件
- [x] T030 [US2] 在 src/app/services/position/riskModeService.ts 中实现风险模式切换逻辑
- [x] T031 [US2] 更新仪表盘组件以响应风险模式变化
- [x] T032 [US2] 根据风险模式添加阈值配置
- [x] T033 [US2] 为不同风险模式实现颜色编码和显示变化
- [x] T034 [US2] 在 src/app/api/position/settings/route.ts 中创建仓位设置 API 路由

**检查点**: 此时，用户故事 1 和 2 都应该可以独立工作

---

## 阶段 5: 用户故事 3 - 接收智能提醒 (优先级: P3)

**目标**: 使投资者能够在关键时刻收到智能提醒

**独立测试**: 通过模拟各种触发场景可以测试提醒机制的响应

### 用户故事 3 的实现

- [x] T035 [P] [US3] 在 src/app/store/position/types.ts 中创建 Alert 模型
- [x] T036 [P] [US3] 在 src/app/store/position/types.ts 中创建 Notification 模型
- [x] T037 [US3] 在 src/app/store/position/store.ts 中扩展 PositionStore 添加提醒功能
- [x] T038 [P] [US3] 在 src/app/components/position-manager/AlertBanner.tsx 中创建 AlertBanner 组件
- [x] T039 [P] [US3] 在 src/app/components/position-manager/NotificationToast.tsx 中创建 NotificationToast 组件
- [x] T040 [US3] 在 src/app/services/position/alertMonitor.ts 中实现提醒监控服务
- [ ] T041 [US3] 使用 WebSocket 连接实现实时仓位监控
- [x] T042 [US3] 基于风险阈值创建提醒触发逻辑
- [x] T043 [US3] 与 AI 代理集成以生成智能提醒
- [x] T044 [US3] 在触发提醒时实现自动仪表盘刷新

**检查点**: 所有用户故事现在都应该可以独立功能化

---

## 阶段 6: AI 代理集成

**目的**: 与现有的 AI 代理集成以进行风险评估和建议

- [x] T045 [P] 使用仓位特定功能扩展 PositionRiskAnalystAgent
- [x] T046 [P] 使用投资组合优化逻辑扩展 DiversificationRecommendationAgent
- [x] T047 [P] 使用仓位策略匹配扩展 PortfolioStrategyAgent
- [x] T048 在 src/app/services/position/aiAgentService.ts 中实现 AI 代理通信层
- [x] T049 创建 AI 生成的洞察显示组件
- [x] T050 将 AI 代理响应与风险计算服务集成

---

## 阶段 7: 高级功能

**目的**: 实现增强用户体验的高级功能

- [x] T051 [P] 创建 HistoricalRiskChart 组件用于趋势分析
- [x] T052 [P] 创建 DiversificationRecommendation 组件
- [x] T053 [P] 创建 StrategyAdvice 组件用于投资组合策略辅助
- [ ] T054 实现历史风险数据持久化到 SqlLite
- [x] T055 创建"假设"场景分析的模拟工具
- [ ] T056 实现带有本地缓存数据的离线模式
- [ ] T057 添加隐私模式检测和处理

---

## 阶段 8: 优化与跨领域关注点

**目的**: 影响多个用户故事的改进

- [ ] T059 代码清理和重构
- [ ] T060 跨所有故事的性能优化
- [ ] T062 安全强化
- [ ] T063 运行 quickstart.md 验证
- [ ] T064 隐私合规性验证
- [ ] T065 数据加密验证
- [ ] T066 所有组件的无障碍改进
- [ ] T067 移动端响应性优化

---

## 依赖关系与执行顺序

### 阶段依赖关系

- **设置 (阶段 1)**: 无依赖关系 - 可以立即开始
- **基础 (阶段 2)**: 依赖于设置完成 - 阻塞所有用户故事
- **用户故事 (阶段 3+)**: 都依赖于基础阶段完成
  - 用户故事然后可以并行进行（如果有人员）
  - 或按优先级顺序依次进行（P1 → P2 → P3）
- **优化 (最终阶段)**: 依赖于所有期望的用户故事完成

### 用户故事依赖关系

- **用户故事 1 (P1)**: 可以在基础阶段完成后开始 - 无其他故事依赖关系
- **用户故事 2 (P2)**: 可以在基础阶段完成后开始 - 可能与 US1 集成但应该可以独立测试
- **用户故事 3 (P3)**: 可以在基础阶段完成后开始 - 可能与 US1/US2 集成但应该可以独立测试

### 每个用户故事内部

- 模型在服务之前
- 服务在组件之前
- 核心实现在集成之前
- 故事完成后再进入下一个优先级

### 并行机会

- 所有标记为 [P] 的设置任务可以并行运行
- 所有标记为 [P] 的基础任务可以并行运行（在阶段 2 内）
- 基础阶段完成后，所有用户故事可以并行开始（如果有团队容量）
- 故事内标记为 [P] 的所有模型可以并行运行
- 不同的用户故事可以由不同团队成员并行工作

---

## 并行示例: 用户故事 1

```bash
# 一起启动用户故事 1 的所有模型:
任务: "在 src/app/store/position/types.ts 中创建 PositionAsset 模型"
任务: "在 src/app/store/position/types.ts 中创建 Portfolio 模型"
任务: "在 src/app/store/position/types.ts 中创建 RiskInsights 模型"

# 一起启动用户故事 1 的所有组件:
任务: "在 src/app/components/position-manager/RiskDashboard.tsx 中创建 RiskDashboard 组件"
任务: "在 src/app/components/position-manager/ConcentrationChart.tsx 中创建 ConcentrationChart 组件"
任务: "在 src/app/components/position-manager/AllocationChart.tsx 中创建 AllocationChart 组件"
任务: "在 src/app/components/position-manager/CorrelationHeatmap.tsx 中创建 CorrelationHeatmap 组件"
任务: "在 src/app/components/position-manager/LiquidityChart.tsx 中创建 LiquidityChart 组件"
```

---

## 实施策略

### MVP 优先 (仅用户故事 1)

1. 完成阶段 1: 设置
2. 完成阶段 2: 基础（关键 - 阻塞所有故事）
3. 完成阶段 3: 用户故事 1
4. **停止并验证**: 独立测试用户故事 1
5. 如果准备好则部署/演示

### 增量交付

1. 完成设置 + 基础 → 基础就绪
2. 添加用户故事 1 → 独立测试 → 部署/演示 (MVP!)
3. 添加用户故事 2 → 独立测试 → 部署/演示
4. 添加用户故事 3 → 独立测试 → 部署/演示
5. 每个故事都增加价值而不会破坏之前的故事

### 并行团队策略

对于多个开发人员:

1. 团队一起完成设置 + 基础
2. 基础完成后:
   - 开发人员 A: 用户故事 1
   - 开发人员 B: 用户故事 2
   - 开发人员 C: 用户故事 3
3. 故事完成并独立集成

---

## 备注

- [P] 任务 = 不同文件，无依赖关系
- [Story] 标签将任务映射到特定的用户故事以进行可追溯性
- 每个用户故事都应该可以独立完成和测试
- 每个任务或逻辑组完成后提交
- 在任何检查点停止以独立验证故事
- 避免: 模糊任务，相同文件冲突，破坏独立性的跨故事依赖关系
- 所有 AI 代理交互必须可模拟以进行可靠测试
- 在整个实施过程中必须维护用户数据隐私