# Agent 评测能力规格说明

## ADDED Requirements

### Requirement: MACEE Evaluation Framework
系统 MUST 提供五维评测模型（MACEE：Mission, Action, Context, Execution, Ethics）来全面评估 Agent 性能，采用 @mastra/evals 作为核心评测引擎。

#### Scenario: 评估任务完成度
- **GIVEN** 一个包含任务结果的 Agent 执行追踪
- **WHEN** 运行 MACEE 评测
- **THEN** 计算任务维度分数，包括：
  - 任务成功率（成功任务数 / 总任务数）
  - 任务效率（实际步骤数 / 最优步骤数）
  - 复杂度适应能力（按难度等级的成功率）

#### Scenario: 评估工具使用（基于 @mastra/evals Tool Call Accuracy）
- **GIVEN** 一个包含工具调用的 Agent 执行追踪
- **WHEN** 运行 MACEE 评测的 Action 维度
- **THEN** 使用 `createToolCallAccuracyScorerLLM` 和 `createToolCallAccuracyScorerCode` 计算：
  - 工具选择准确率（LLM 评判工具选择是否恰当）
  - 工具参数正确率（代码验证参数格式和值）
  - 工具链连贯性（Trajectory 评分）
  - 错误恢复率（恢复的错误数 / 总错误数）

#### Scenario: 评估轨迹正确性（基于 @mastra/evals Trajectory Accuracy）
- **GIVEN** 一个多步骤 Agent 执行序列
- **WHEN** 运行轨迹评测
- **THEN** 使用 `createTrajectoryAccuracyScorerLLM` 评估：
  - 每个步骤是否必要
  - 步骤顺序是否合理
  - 是否有缺失的步骤
  - 是否有多余的步骤
- **AND** 返回 0-1 评分及详细理由

#### Scenario: 评估上下文理解
- **GIVEN** 一个多轮对话及 Agent 响应
- **WHEN** 运行 MACEE 评测
- **THEN** 使用 `createContextRelevanceScorerLLM` 和 `createContextPrecisionScorer` 计算：
  - 意图理解准确率
  - 上下文保持率（保持上下文的轮数 / 总轮数）
  - 知识检索相关性（相关结果数 / 检索结果数）

#### Scenario: 评估执行质量
- **GIVEN** Agent 响应及可观测性数据
- **WHEN** 运行 MACEE 评测
- **THEN** 使用 @mastra/evals 多个评分器计算：
  - 响应相关性（Answer Relevancy）
  - 响应完整性（Completeness Scorer）
  - 数据准确性与上下文一致性（Faithfulness）
  - 可观测性完整性（trace/span/metrics 是否存在）

#### Scenario: 评估响应信实度（基于 @mastra/evals Faithfulness）
- **GIVEN** Agent 响应及其基于的上下文数据（如工具调用结果）
- **WHEN** 运行信实度评测
- **THEN** 使用 `createFaithfulnessScorer`：
  - 提取响应中的声明
  - 验证每个声明是否有上下文支持
  - 返回支持声明占比评分

#### Scenario: 评估伦理与合规（结合 @mastra/evals 与自定义检查）
- **GIVEN** Agent 对投资查询的响应
- **WHEN** 运行 MACEE 评测的 Ethics 维度
- **THEN** 使用以下评分器的组合：
  - `createToxicityScorer`（LLM）- 检测有害内容
  - `createBiasScorer`（LLM）- 检测偏见推荐
  - `createPromptAlignmentScorerLLM`（LLM）- 验证合规指令遵循
  - 自定义投资合规检查器（风险披露、禁止用语）

---

### Requirement: Benchmark Test Datasets
系统 MUST 提供覆盖所有 Agent 核心能力的分类基准测试数据集。第一阶段 MUST 提供 100 个 MVP 用例，后续扩展用例 MUST NOT 作为 P1 验收条件。

#### Scenario: 加载资产查询基准数据
- **GIVEN** 评测数据集目录
- **WHEN** 加载资产查询类别
- **THEN** 测试用例数量为 20 个
- **AND** 测试用例包括：
  - 股票报价查询及预期数据 Schema
  - 基本面数据查询及验证规则
  - 多股票对比场景

#### Scenario: 加载投资组合分析基准数据
- **GIVEN** 评测数据集目录
- **WHEN** 加载投资组合分析类别
- **THEN** 测试用例数量为 20 个
- **AND** 测试用例包括：
  - 风险分析场景及预期指标
  - 投资组合优化及约束满足
  - 投资建议及可操作性标准

#### Scenario: 加载多轮推理基准数据
- **GIVEN** 评测数据集目录
- **WHEN** 加载多轮推理类别
- **THEN** 测试用例数量为 20 个
- **AND** 测试用例包括：
  - 跨轮次有上下文依赖的对话
  - 推理链验证要求
  - 上下文保持期望

#### Scenario: 加载边缘案例基准数据
- **GIVEN** 评测数据集目录
- **WHEN** 加载边缘案例类别
- **THEN** 测试用例数量为 15 个
- **AND** 测试用例包括：
  - 合规违规尝试（要求保证收益）
  - 错误恢复场景（工具失败、无效输入）
  - 需要优雅处理的异常查询

#### Scenario: 加载市场研究基准数据
- **GIVEN** 评测数据集目录
- **WHEN** 加载市场研究类别
- **THEN** 测试用例数量为 25 个
- **AND** 测试用例包括：
  - 新闻摘要与情绪分析场景
  - 趋势判断场景
  - 多来源信息整合场景

#### Scenario: 验证测试用例 Schema
- **GIVEN** 一个测试用例 JSON 文件
- **WHEN** 加载以进行评测
- **THEN** Schema 验证器检查：
  - 必填字段存在（id、category、input、evaluator）
  - evaluator 类型有效（exact_match、schema_validation、llm_judge、human、hybrid）
  - 为需要的验证器定义期望输出

---

### Requirement: Mastra Evals Integration
系统 MUST 集成 @mastra/evals 作为核心评测引擎，提供预构建和自定义评分器。

#### Scenario: 创建 LLM 评测评分器
- **GIVEN** 一个配置好的 LLM 模型（如 GPT-4o、Claude）
- **WHEN** 初始化评测引擎
- **THEN** 可以创建以下 LLM 评分器：
  - `createToolCallAccuracyScorerLLM` - 工具调用准确性
  - `createTrajectoryAccuracyScorerLLM` - 轨迹准确性
  - `createFaithfulnessScorer` - 信实度
  - `createAnswerRelevancyScorer` - 回答相关性
  - `createContextRelevanceScorerLLM` - 上下文相关性
  - `createContextPrecisionScorer` - 上下文精确度
  - `createHallucinationScorer` - 幻觉检测
  - `createBiasScorer` - 偏见检测
  - `createToxicityScorer` - 毒性检测
  - `createNoiseSensitivityScorerLLM` - 噪声敏感度
  - `createPromptAlignmentScorerLLM` - 提示对齐

#### Scenario: 创建代码评测评分器
- **GIVEN** 评测配置
- **WHEN** 需要确定性评测
- **THEN** 可以创建以下代码评分器：
  - `createToolCallAccuracyScorerCode` - 工具调用确定性验证
  - `createTrajectoryAccuracyScorerCode` - 轨迹确定性验证
  - `createContentSimilarityScorer` - 内容相似度
  - `createKeywordCoverageScorer` - 关键词覆盖
  - `createToneScorer` - 语调分析
  - `createCompletenessScorer` - 完整性检查

#### Scenario: 运行单个评分器
- **GIVEN** 一个评分器实例和 Agent 运行记录
- **WHEN** 通过项目内部 scorer wrapper 执行评分
- **THEN** 返回包含以下内容的评分结果：
  - 0-1 范围的评分
  - 评分理由说明
  - 详细的分析数据（如适用）
- **AND** wrapper MUST 隔离 @mastra/evals 的具体调用 API

#### Scenario: 组合多个评分器
- **GIVEN** 多个评分器配置
- **WHEN** 创建复合评测
- **THEN** 系统支持：
  - 按权重组合多个评分器
  - 定义评分器依赖关系
  - 聚合评分结果
  - 生成综合报告

---

### Requirement: Custom Investment Scorers
系统 MUST 提供投资领域特定的自定义评分器，扩展 @mastra/evals 基础能力。

#### Scenario: 创建风险披露检查评分器
- **GIVEN** Agent 对投资建议查询的响应
- **WHEN** 运行风险披露检查
- **THEN** 评分器验证：
  - 存在风险警告文本（"风险提示"、"投资有风险"等关键词）
  - 风险披露位置适当（建议之前或之后）
  - 风险描述具体（非泛泛而谈）
- **AND** 返回 0-1 评分及缺失项列表

#### Scenario: 创建禁止用语检测评分器
- **GIVEN** 一个 Agent 响应
- **WHEN** 运行禁止用语检测
- **THEN** 评分器标记以下违规：
  - "保证收益"、"稳赚"、"必涨"
  - "无风险"、"零风险"
  - "内幕消息"、"内部信息"
  - "100% 成功"等绝对化表述
- **AND** 返回 0 分和具体违规内容，或 1 分表示通过

#### Scenario: 创建数据准确性评分器
- **GIVEN** Agent 响应中的金融数据（价格、指标）
- **WHEN** 运行数据准确性验证
- **THEN** 评分器：
  - 提取响应中的数字数据
  - 与真实数据源交叉验证
  - 计算数据偏差百分比
  - 标记超过阈值（如 5%）的差异

#### Scenario: 创建投资建议评分器
- **GIVEN** Agent 生成的投资建议
- **WHEN** 运行建议质量评测
- **THEN** 评分器评估：
  - 建议的可操作性（是否可执行）
  - 推理链的完整性
  - 支持数据的充分性
  - 免责声明的完备性

---

### Requirement: Automated Evaluation Pipeline
系统 MUST 提供与 CI/CD 集成的自动化评测流水线。

#### Scenario: 运行完整评测套件
- **GIVEN** 基准数据集和 Agent 配置
- **WHEN** 执行 `pnpm eval --full`
- **THEN** 系统：
  - 顺序运行所有基准类别
  - 使用 @mastra/evals 评分器
  - 通过 Hermes 可观测性收集执行追踪
  - 计算每个类别的 MACEE 分数
  - 生成汇总报告
  - 如果所有阈值满足则返回退出码 0

#### Scenario: 运行特定类别评测
- **GIVEN** 评测数据集和特定类别
- **WHEN** 执行 `pnpm eval --category asset-query`
- **THEN** 系统：
  - 加载指定类别的测试用例
  - 运行该类别的所有评测
  - 输出该类别的分数
  - 返回通过/失败状态

#### Scenario: 检测回归
- **GIVEN** 基线评测结果（来自主分支或上一版本）
- **WHEN** 运行 `pnpm eval --regression --baseline v1.2.0`
- **THEN** 系统：
  - 对比当前结果与基线
  - 在分数下降超过阈值（默认 5%）时标记回归
  - 列出退化的具体用例
  - 如果存在回归则返回非零退出码

#### Scenario: 在基准测试上对比引擎
- **GIVEN** 多个 Agent 引擎（DeepAgents、Claude、Hermes）
- **WHEN** 运行 `pnpm eval --compare deepagents,claude,hermes`
- **THEN** 系统：
  - 在每个引擎上运行相同的基准测试
  - 收集每个引擎的可比指标
  - 生成对比矩阵
  - 突出显示统计显著差异

#### Scenario: 生成引擎对比报告
- **GIVEN** 完成的多引擎评测
- **WHEN** 生成对比报告
- **THEN** 报告包括：
  - 每个维度的分数对比表
  - 每会话成本对比
  - 延迟分布对比
  - 按用例的引擎选择建议

---

### Requirement: Evaluation Report Generation
系统 MUST 生成多种格式的全面评测报告。

#### Scenario: 生成 JSON 评测报告
- **GIVEN** 完成的评测运行
- **WHEN** 生成 JSON 报告
- **THEN** 报告包括：
  - 总计/通过/失败计数的摘要
  - 每个维度的 MACEE 分数
  - 每个 @mastra/evals 评分器的详细结果
  - 每个类别的分解
  - 每个测试用例的详细信息和追踪
  - 时间戳和配置元数据

#### Scenario: 生成 Markdown 摘要报告
- **GIVEN** 完成的评测运行
- **WHEN** 生成 Markdown 报告
- **THEN** 报告包括：
  - 带通过/失败状态的执行摘要
  - 分数概览表
  - 关键发现和建议
  - 详细 JSON 报告链接

#### Scenario: 生成 HTML 可视化报告
- **GIVEN** 完成的评测运行
- **WHEN** 使用 `--format html` 生成 HTML 报告
- **THEN** 报告包括：
  - 维度分数的交互式图表
  - 历史对比趋势线
  - 可展开的每个用例详情部分
  - 原始数据导出选项

---

### Requirement: Evaluation Run Record
系统 MUST 定义统一的 `EvaluationRunRecord` 作为所有 Agent 引擎的评测输入边界。

#### Scenario: 创建统一评测运行记录
- **GIVEN** 任意 Agent 引擎完成一次测试用例运行
- **WHEN** 采集评测输入
- **THEN** 系统 MUST 生成 `EvaluationRunRecord`
- **AND** 记录 MUST 包含：
  - 用户输入和 Agent 最终输出
  - 规范化消息序列
  - 工具调用名称、参数、结果、错误状态和耗时
  - 引擎名称、agentId、caseId、状态和时间戳
  - token、成本、延迟和可选 trace/span/metric 事件
  - 错误原因和可恢复性标记（如适用）

#### Scenario: 采集 Hermes 运行记录
- **GIVEN** Hermes Agent 使用 callbacks 或 observability sinks 运行
- **WHEN** Agent 运行完成
- **THEN** 系统 MUST 将 trace/span/metric 摘要、工具事件和最终响应写入 `EvaluationRunRecord`
- **AND** 不依赖 `HermesAgentResult.observability` 摘要以外的未定义字段

#### Scenario: 采集 DeepAgents 运行记录
- **GIVEN** DeepAgents 引擎产生流式事件、工具事件和最终响应
- **WHEN** Agent 运行完成
- **THEN** 系统 MUST 将这些事件规范化为 `EvaluationRunRecord`
- **AND** 保留工具调用顺序和错误状态

#### Scenario: 采集 Claude Agent SDK 运行记录
- **GIVEN** Claude Agent SDK 产生消息内容块、工具使用和工具结果
- **WHEN** Agent 运行完成
- **THEN** 系统 MUST 将消息和工具事件规范化为 `EvaluationRunRecord`
- **AND** 保留多轮上下文所需的消息顺序

---

### Requirement: Mastra Data Format Adapter
系统 MUST 提供适配器，将 `EvaluationRunRecord` 转换为 @mastra/evals 所需的输入格式。

#### Scenario: 转换 Hermes 追踪为 Mastra 格式
- **GIVEN** 从 Hermes 采集的 `EvaluationRunRecord`
- **WHEN** 运行评测
- **THEN** 适配器将运行记录转换为 @mastra/evals 的 `ScorerRunInput`：
  - 提取用户输入消息
  - 提取 Agent 响应消息
  - 提取工具调用及结果
  - 构建轨迹结构

#### Scenario: 转换 DeepAgents 追踪为 Mastra 格式
- **GIVEN** 从 DeepAgents 采集的 `EvaluationRunRecord`
- **WHEN** 运行评测
- **THEN** 适配器将运行记录转换为 @mastra/evals 格式：
  - 映射工具调用事件
  - 映射模型生成事件
  - 映射工作流步骤事件
  - 保留时序和层级关系

#### Scenario: 转换 Claude Agent 追踪为 Mastra 格式
- **GIVEN** 从 Claude Agent SDK 采集的 `EvaluationRunRecord`
- **WHEN** 运行评测
- **THEN** 适配器将运行记录转换为 @mastra/evals 格式：
  - 提取消息内容块
  - 提取工具使用和结果
  - 构建统一的消息格式

---

### Requirement: Evaluation Result Persistence
系统 MUST 持久化评测运行结果、scorer 明细、报告和回归基线。

#### Scenario: 保存评测运行结果
- **GIVEN** 一个评测套件运行完成
- **WHEN** 写入数据库
- **THEN** 系统 MUST 保存运行元数据、每个测试用例结果、每个 scorer 分数、聚合 MACEE 分数和报告路径
- **AND** 记录 MUST 可按 runId、caseId、engine 和 baseline 查询

#### Scenario: 复用短期缓存结果
- **GIVEN** 相同测试用例、相同引擎、相同配置在 7 天内已有成功结果
- **WHEN** 运行评测且未指定 `--no-cache`
- **THEN** 系统 MAY 复用缓存结果
- **AND** 报告 MUST 标记该结果来自缓存

#### Scenario: 保存回归基线
- **GIVEN** 一次评测运行被标记为基线
- **WHEN** 保存基线
- **THEN** 系统 MUST 长期保留该基线的聚合分数和用例明细
- **AND** 回归检测 MUST 能与该基线进行比较

#### Scenario: 提取上下文数据用于 Faithfulness 评测
- **GIVEN** Agent 运行记录包含工具调用结果
- **WHEN** 运行信实度评测
- **THEN** 适配器从工具调用结果中提取上下文：
  - 股票报价数据
  - 财务指标数据
  - 新闻和市场信息
  - 用户笔记内容
- **AND** 将上下文传递给 `createFaithfulnessScorer`

---

### Requirement: Session Replay Evaluation
系统 MUST 支持回放录制的会话用于回归测试和分析。

#### Scenario: 录制生产会话
- **GIVEN** 生产环境的用户聊天会话
- **WHEN** 启用会话录制
- **THEN** 系统捕获：
  - 所有用户输入及时间戳
  - Agent 响应和工具调用
  - 每轮的上下文状态
  - 会话元数据（引擎、模型、配置）

#### Scenario: 回放录制的会话
- **GIVEN** 具有特定 ID 的录制会话
- **WHEN** 运行 `pnpm eval --replay <session-id>`
- **THEN** 系统：
  - 重建会话上下文
  - 回放每个用户输入
  - 捕获新的 Agent 响应
  - 与原始响应比较

#### Scenario: 使用内容相似度检测会话漂移
- **GIVEN** 原始和回放的会话响应
- **WHEN** 计算漂移分析
- **THEN** 使用 `createContentSimilarityScorer` 计算：
  - 语义相似度分数（0-1）
  - 设置相似度阈值（如 0.8）
  - 标记低于阈值的响应

---

### Requirement: Test Case Authoring Support
系统 MUST 提供工具帮助作者创建有效的测试用例。

#### Scenario: 验证新测试用例
- **GIVEN** 草稿测试用例 JSON
- **WHEN** 运行 `pnpm eval --validate-case <file>`
- **THEN** 验证器报告：
  - Schema 合规错误
  - 缺少必填字段
  - 无效的 evaluator 类型
  - 改进建议

#### Scenario: 生成测试用例模板
- **GIVEN** 类别和难度级别
- **WHEN** 运行 `pnpm eval --generate-template asset-query --difficulty hard`
- **THEN** 系统输出：
  - 包含所有必填字段的模板 JSON
  - 适合类别的示例内容
  - 适合难度的复杂度

#### Scenario: 导入会话作为测试用例
- **GIVEN** 录制的会话 ID
- **WHEN** 运行 `pnpm eval --import-session <session-id>`
- **THEN** 系统：
  - 提取会话轮次
  - 识别使用的工具
  - 从实际输出生成期望输出 Schema
  - 创建待审查的草稿测试用例

---

### Requirement: Expected Trajectory Support
系统 MUST 支持 @mastra/evals 的预期轨迹功能，定义 Agent 执行的正确路径。

#### Scenario: 定义预期轨迹
- **GIVEN** 一个测试用例
- **WHEN** 需要验证 Agent 执行路径
- **THEN** 可以定义预期轨迹，包括：
  - 预期工具调用序列
  - 每个步骤的预期参数
  - 允许的变体和可选步骤
  - 预期输出结构

#### Scenario: 轨迹严格匹配评测
- **GIVEN** 预期轨迹和实际执行轨迹
- **WHEN** 运行严格轨迹评测
- **THEN** 使用 `createTrajectoryAccuracyScorerLLM` 对比：
  - 验证每个步骤是否匹配预期
  - 检查步骤顺序是否正确
  - 检查是否有缺失或多余步骤
  - 返回匹配分数和详细差异

#### Scenario: 轨迹灵活匹配评测
- **GIVEN** 预期轨迹（包含可选步骤）
- **WHEN** 运行灵活轨迹评测
- **THEN** 评分器：
  - 接受达到相同目标的不同路径
  - 验证关键步骤的存在
  - 允许可选步骤的缺失或替换
  - 返回灵活匹配分数

---

### Requirement: Unified CLI Entry Point
系统 MUST 提供统一的交互式 CLI 入口，同时支持命令行参数模式，以适应日常开发和 CI/CD 自动化场景。

#### Scenario: 交互式模式运行评测
- **GIVEN** 用户在项目根目录
- **WHEN** 执行 `pnpm eval`（无参数）
- **THEN** 系统显示交互式菜单：
  - 选择评测类型（完整评测、类别评测、引擎对比、回归测试）
  - 选择评测类别（如选择了类别评测）
  - 选择引擎（如选择了引擎对比）
  - 选择报告格式
  - 确认执行

#### Scenario: 命令行参数模式运行完整评测
- **GIVEN** 用户需要快速运行评测
- **WHEN** 执行 `pnpm eval --full` 或 `pnpm eval -f`
- **THEN** 系统跳过交互菜单，直接运行完整评测套件
- **AND** 使用默认配置（所有类别、当前引擎、JSON 报告）

#### Scenario: 命令行参数模式运行类别评测
- **GIVEN** 用户需要评测特定类别
- **WHEN** 执行 `pnpm eval --category asset-query` 或 `pnpm eval -c asset-query`
- **THEN** 系统只运行指定类别的评测
- **AND** 支持多个类别 `pnpm eval -c asset-query -c portfolio-analysis`

#### Scenario: 命令行参数模式运行引擎对比
- **GIVEN** 用户需要对比多个引擎
- **WHEN** 执行 `pnpm eval --compare deepagents,claude,hermes`
- **THEN** 系统在指定引擎上运行评测
- **AND** 生成对比报告

#### Scenario: 混合模式和参数
- **GIVEN** 用户需要自定义评测配置
- **WHEN** 执行 `pnpm eval --category asset-query --format html --output ./reports`
- **THEN** 系统组合所有参数运行评测
- **AND** 支持的参数包括：
  - `--full, -f`: 完整评测
  - `--category, -c <name>`: 类别评测
  - `--compare <engines>`: 引擎对比
  - `--regression, -r`: 回归测试
  - `--baseline <version>`: 基线版本
  - `--format <json|md|html>`: 报告格式
  - `--output <path>`: 输出目录
  - `--verbose, -v`: 详细日志
  - `--dry-run`: 预览不执行

#### Scenario: CI/CD 友好输出
- **GIVEN** 评测在 CI/CD 环境中运行
- **WHEN** 检测到非交互式终端（CI=true 或 --ci 参数）
- **THEN** 系统：
  - 禁用交互式菜单
  - 使用结构化日志输出
  - 进度指示使用机器可读格式
  - 退出码反映评测结果（0=通过，1=失败）

#### Scenario: 评测配置持久化
- **GIVEN** 用户有常用的评测配置
- **WHEN** 在项目根目录创建 `evaluation.config.ts`
- **THEN** 系统：
  - 读取默认配置（默认类别、引擎、报告格式等）
  - 命令行参数可覆盖配置文件
  - 支持多个命名配置（如 `evaluation.config.ci.ts`）

#### Scenario: 显示帮助和版本信息
- **GIVEN** 用户需要了解命令用法
- **WHEN** 执行 `pnpm eval --help` 或 `pnpm eval -h`
- **THEN** 系统显示：
  - 所有可用命令和参数
  - 使用示例
  - 支持的评测类别列表
  - 支持的引擎列表

#### Scenario: 显示评测状态和进度
- **GIVEN** 评测正在运行
- **WHEN** 查看终端输出
- **THEN** 系统：
  - 显示当前运行的类别和用例
  - 显示进度条（已完成/总数）
  - 显示预估剩余时间
  - 显示当前正在使用的评分器
  - 交互模式下支持取消（Ctrl+C）
