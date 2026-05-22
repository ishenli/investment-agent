# Agent 评测框架提案

## 为什么

我们需要一个完整的评测框架来：

1. **证明 Agent 能力**：证明我们的多引擎 AI Agent 系统（DeepAgents、Claude、Hermes）能够可靠地处理投资分析任务
2. **确保质量**：在发布到生产环境之前，建立客观的指标和测试覆盖率
3. **支持迭代**：为改进 Agent 性能和比较不同引擎提供反馈循环
4. **建立信任**：让用户和利益相关者对 AI 驱动的投资建议有信心
5. **行业最佳实践**：采用成熟的评测框架 @mastra/evals，与 2026 年 LLM Agent 评测标准对齐

当前差距：
- 没有结构化的 Agent 能力测试数据集
- 没有自动化的评测流水线
- 没有 LLM-as-Judge 集成
- 没有 Agent 行为的回归测试
- 没有多引擎对比基准

## 变更内容

新增一个 `agent-evaluation` 能力，**基于 @mastra/evals** 实现：

### 1. 采用 @mastra/evals 作为核心评测引擎

使用 Mastra 提供的预构建评分器：

**LLM 评分器（需要 LLM 模型）**
- `createToolCallAccuracyScorerLLM` - 工具调用准确性评测
- `createTrajectoryAccuracyScorerLLM` - 轨迹正确性评测
- `createFaithfulnessScorer` - 响应信实度（是否基于上下文）
- `createAnswerRelevancyScorer` - 回答相关性
- `createContextRelevanceScorerLLM` - 上下文相关性
- `createContextPrecisionScorer` - 上下文精确度
- `createHallucinationScorer` - 幻觉检测
- `createBiasScorer` - 偏见检测
- `createToxicityScorer` - 毒性检测
- `createNoiseSensitivityScorerLLM` - 噪声敏感度
- `createPromptAlignmentScorerLLM` - 提示对齐

**代码/确定性评分器（无需 LLM）**
- `createToolCallAccuracyScorerCode` - 工具调用确定性验证
- `createTrajectoryAccuracyScorerCode` - 轨迹确定性验证
- `createContentSimilarityScorer` - 内容相似度
- `createKeywordCoverageScorer` - 关键词覆盖
- `createToneScorer` - 语调分析
- `createCompletenessScorer` - 完整性检查

### 2. MACEE 评测模型

五维评测框架，映射到 @mastra/evals 评分器：

| 维度 | @mastra/evals 评分器 | 说明 |
|------|---------------------|------|
| **M - Mission（任务完成度）** | Trajectory Accuracy | 任务是否完成，步骤是否必要 |
| **A - Action（工具使用）** | Tool Call Accuracy | 工具选择是否正确，参数是否准确 |
| **C - Context（上下文理解）** | Context Relevance, Context Precision | 上下文理解是否准确 |
| **E - Execution（执行质量）** | Faithfulness, Answer Relevancy, Completeness | 响应是否基于事实，是否完整 |
| **E - Ethics（安全与合规）** | Toxicity, Bias, Prompt Alignment + 自定义投资合规 | 无有害内容，符合合规要求 |

### 3. 基准测试数据集

第一阶段交付 **100 个 MVP 基准用例**，先覆盖评测闭环和主要投资场景：

- **资产查询**（20 用例）：股票报价、基本面、对比分析
- **投资组合分析**（20 用例）：风险分析、优化建议
- **市场研究**（25 用例）：新闻分析、情绪、趋势
- **多轮推理**（20 用例）：上下文保持、推理链
- **边缘案例**（15 用例）：合规、错误恢复、异常查询

后续阶段可扩展到 170+ 用例，但不作为本提案 P1 验收条件。

### 4. 投资领域自定义评分器

扩展 @mastra/evals，添加投资特定的评测：

- **风险披露检查器**：验证投资建议是否包含风险提示
- **禁止用语检测器**：检测"保证收益"、"必涨"等违规用语
- **数据准确性评分器**：验证金融数据的准确性
- **投资建议质量评分器**：评估建议的可操作性

### 5. 数据格式适配器

先定义统一 `EvaluationRunRecord` 作为三种 Agent 引擎的评测输入边界，再转换为 @mastra/evals 所需格式：

- Hermes callbacks/sinks → `EvaluationRunRecord` → Mastra `ScorerRunInput`
- DeepAgents 流式事件/工具事件 → `EvaluationRunRecord` → Mastra Trajectory
- Claude Agent SDK 消息和工具事件 → `EvaluationRunRecord` → Mastra 消息格式

`EvaluationRunRecord` 必须包含用户输入、Agent 输出、消息序列、工具调用、工具结果、错误、成本、延迟和可选 trace/span 事件，避免各引擎直接耦合到 Mastra 输入格式。

### 6. CI/CD 集成

- Agent 代码变更时的预合并评测
- 每周完整基准测试运行
- 基线回归检测
- 报告生成和可视化

## 影响

### 正面影响
- **快速落地**：使用成熟的 @mastra/evals 框架，避免从零构建
- **社区生态**：与 Mastra 生态对齐，可复用社区组件
- **质量保证**：在生产部署前发现问题
- **性能可见性**：Agent 能力的可量化指标
- **引擎对比**：基于数据驱动的用例引擎选择
- **更快迭代**：自动化的改进反馈循环
- **用户信任**：能力的可证明证据

### 依赖
- 添加 `@mastra/evals` 包依赖
- 添加 `@mastra/core` peer dependency（用于 scorer 与 LLM model config）
- 依赖 `agent-management` spec（现有 Agent）
- 依赖 `model-provider` spec（LLM-as-Judge）
- 依赖 `database` spec（测试结果存储）

### 影响组件
- 新的评测目录结构
- 新的评测命令 NPM 脚本
- 新的 CI/CD 工作流
- 新的测试数据集和 Schema
- Hermes 可观测性集成
- Agent 追踪格式适配器

### 迁移路径
这是一个增量变更：

**第一阶段（第 1-2 周）**：集成 @mastra/evals
- 完成 @mastra/evals 最小 API spike（1 个代码评分器 + 1 个 LLM 评分器）
- 安装依赖并配置模型
- 定义 `EvaluationRunRecord` 并实现三引擎采集/适配
- 创建基础评测脚本
- 创建 100 个 MVP 基准用例

**第二阶段（第 3-4 周）**：构建数据集和自定义评分器
- 实现投资领域自定义评分器
- 完善评测结果持久化、缓存和基线对比
- 集成 CI/CD

**第三阶段（第 5-8 周）**：高级功能
- 报告可视化
- 多引擎对比增强
- 会话回放评测

在线评测、A/B 测试和人工评测平台属于后续独立提案，不作为本变更的交付范围。

对现有功能无破坏性变更。

## 技术决策

### 为什么选择 @mastra/evals？

1. **成熟度**：提供了完整的 LLM 评测工具集，包括工具调用和轨迹评测
2. **与 Agent 框架对齐**：@mastra/evals 是 Mastra Agent 框架的一部分，设计理念契合
3. **灵活性**：支持自定义评分器，可以扩展投资领域特定逻辑
4. **类型安全**：TypeScript 原生支持，类型定义完善
5. **简单集成**：评分器 API 简洁，易于在任何评测流水线中使用

### 不选择其他方案的原因

| 方案 | 优点 | 缺点 |
|------|------|------|
| 从零构建 | 完全可控 | 开发成本高，不必要重复造轮子 |
| Ragas | RAG 评测成熟 | 不支持工具调用、轨迹评测 |
| TruLens | 功能丰富 | Python 实现，与现有 TypeScript 栈不兼容 |
| LangSmith | 生态完善 | 商业服务，有成本和依赖风险 |
| OpenAI Evals | OpenAI 官方 | 主要针对单一模型，不适合多引擎 Agent |
