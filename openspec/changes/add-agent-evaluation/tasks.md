# Agent 评测框架 - 实现任务

## 第一阶段：CLI 基础设施与 @mastra/evals 集成（第 1-2 周）

### 1.1 CLI 入口框架
- [x] 创建 `evaluation/cli/index.ts` 统一入口
- [x] 实现模式检测逻辑（交互式 vs 命令行参数）
- [ ] 使用 commander 解析命令行参数
- [ ] 使用 inquirer 实现交互式菜单
- [x] 实现 CI 环境检测（CI=true 或 --ci 参数）
- [x] 实现配置文件加载（evaluation.config.ts）
- [x] 实现帮助和版本命令（--help, --version）
- [x] 实现进度显示（交互模式和 CI 模式）
- [ ] 编写 CLI 入口单元测试

### 1.2 依赖安装与配置
- [x] 安装 @mastra/evals 包及相关依赖
- [x] 安装 @mastra/core peer dependency
- [ ] 安装 commander 和 inquirer（CLI 框架）
- [x] 完成 @mastra/evals API spike：跑通 1 个代码评分器
- [x] 完成 @mastra/evals API spike：跑通 1 个 LLM 评分器
- [x] 封装项目内部 scorer wrapper，隔离 Mastra API 变更
- [x] 配置评测用模型提供者（复用现有 model-provider）
- [x] 创建评测运行器基础类
- [x] 配置评测日志和输出目录
- [x] 创建 evaluation.config.ts 默认配置

### 1.3 评测数据合同与采集
- [x] 定义 `EvaluationRunRecord` 类型和 Zod Schema
- [x] 实现 Hermes callbacks/sinks 到 `EvaluationRunRecord` 的采集器
- [ ] 实现 DeepAgents 流式事件/工具事件到 `EvaluationRunRecord` 的采集器
- [ ] 实现 Claude Agent SDK 消息/工具事件到 `EvaluationRunRecord` 的采集器
- [ ] 编写采集器单元测试

### 1.4 数据格式适配器
- [x] 实现 `EvaluationRunRecord` 到 Mastra ScorerRunInput 的转换器
- [x] 实现 `EvaluationRunRecord` 到 Mastra Trajectory 的转换器
- [x] 实现 `EvaluationRunRecord` 到 LLM Judge 输入格式的转换器
- [x] 实现上下文数据提取器（用于 Faithfulness 评测）
- [ ] 编写适配器单元测试

### 1.5 核心评测引擎
- [x] 创建 MACEE 评测框架，集成 @mastra/evals 评分器
- [x] 实现评分器组合逻辑（多评分器权重聚合）
- [x] 实现评测结果聚合并生成 MACEE 维度分数
- [x] 集成以下 @mastra/evals LLM 评分器：
  - `createToolCallAccuracyScorerLLM`
  - `createTrajectoryAccuracyScorerLLM`
  - `createFaithfulnessScorer`
  - `createAnswerRelevancyScorer`
  - `createContextRelevanceScorer`
- [x] 集成以下 @mastra/evals 代码评分器：
  - `createToolCallAccuracyScorerCode`
  - `createTrajectoryAccuracyScorerCode`
  - `createContentSimilarityScorer`
  - `createCompletenessScorer`

### 1.6 结果持久化
- [x] 设计评测运行表、用例结果表、scorer 结果表、报告表、基线表
- [x] 创建 Drizzle schema 和 migration
- [x] 实现评测结果写入和读取 repository
- [ ] 实现 7 天结果缓存复用逻辑
- [x] 实现基线结果长期保留逻辑
- [ ] 编写 repository 单元测试

### 1.7 基础命令处理器
- [x] 实现 `full.ts` 完整评测命令处理器
- [x] 实现 `category.ts` 类别评测命令处理器
- [x] 实现命令处理器与评测引擎的集成
- [ ] 统一命令合同为 `pnpm eval --full`、`pnpm eval --category <name>`、`pnpm eval --compare <engines>`、`pnpm eval --regression --baseline <id>`、`pnpm eval --replay <session-id>`
- [x] 实现退出码逻辑（0=通过，1=失败）
- [ ] 编写命令处理器测试

### 1.8 初始基准数据集（100 用例）
- [x] 创建基准测试目录结构
- [x] 创建 20 个资产查询测试用例
- [x] 创建 20 个投资组合分析测试用例
- [x] 创建 25 个市场研究测试用例
- [x] 创建 20 个多轮推理测试用例
- [x] 创建 15 个边缘案例测试用例
- [ ] 编写测试用例 Schema 验证器

### 1.9 基础报告
- [x] 实现 JSON 报告生成器
- [x] 实现 Markdown 摘要生成器
- [x] 创建评测结果 Schema

## 第二阶段：自定义评分器与自动化（第 3-4 周）

### 2.1 投资领域自定义评分器
- [x] 实现风险披露检查评分器
- [x] 实现禁止用语检测评分器
- [x] 实现数据准确性评分器
- [x] 实现投资建议质量评分器
- [x] 将自定义评分器集成到 MACEE Ethics 维度

### 2.2 LLM-as-Judge 集成扩展
- [x] 集成 `createToxicityScorer`（毒性检测）
- [x] 集成 `createBiasScorer`（偏见检测）
- [x] 集成 `createPromptAlignmentScorer`（提示对齐）
- [x] 集成 `createHallucinationScorer`（幻觉检测）
- [x] 集成 `createNoiseSensitivityScorer`（噪声敏感度）
- [x] 实现 Judge 结果聚合和一致性检查

### 2.3 高级命令处理器
- [ ] 实现 `compare.ts` 引擎对比命令处理器
- [ ] 实现 `regression.ts` 回归测试命令处理器
- [ ] 实现参数覆盖配置文件的逻辑
- [ ] 实现详细日志模式（--verbose）
- [x] 实现预览模式（--dry-run）
- [ ] 编写高级命令处理器测试

### 2.4 CI/CD 流水线
- [ ] 创建 GitHub Actions 评测工作流
- [ ] 为 Agent 代码变更添加预合并钩子
- [ ] 安排每周完整基准测试运行
- [ ] 集成 PR 状态检查
- [ ] 确保 CI 模式下禁用交互式菜单

### 2.5 自动化回归测试
- [x] 实现基线对比逻辑
- [ ] 创建回归检测算法
- [x] 添加基于阈值的通过/失败标准
- [ ] 实现回归告警

### 2.6 多引擎支持
- [x] 添加引擎无关的评测接口
- [x] 实现 DeepAgents 引擎评测适配器
- [x] 实现 Claude 引擎评测适配器
- [x] 实现 Hermes 引擎评测适配器
- [ ] 创建引擎对比报告器

## 第三阶段：高级评测功能（第 5-8 周）

### 3.1 会话回放
- [ ] 实现 `replay.ts` 会话回放命令处理器
- [ ] 实现会话录制基础设施
- [ ] 创建会话回放机制
- [ ] 使用 `createContentSimilarityScorer` 进行回放和原始会话差异检测
- [ ] 创建回放报告格式

### 3.2 预期轨迹支持
- [x] 实现预期轨迹定义格式
- [x] 集成 `createTrajectoryAccuracyScorerLLM` 用于轨迹验证
- [ ] 实现轨迹灵活匹配（允许变体）
- [ ] 创建轨迹匹配报告

## 第四阶段：文档与工具（第 8-10 周）

### 4.1 文档
- [ ] 编写评测框架用户指南
- [ ] 创建测试用例编写指南
- [ ] 记录 CLI 使用方法（交互式和参数模式）
- [ ] 记录 @mastra/evals 评分器使用方法
- [ ] 记录评测指标定义
- [ ] 创建仪表板使用文档
- [ ] 编写配置文件指南

### 4.2 CLI 完善
- [x] 完善帮助信息（支持类别列表、引擎列表）
- [ ] 实现进度条显示
- [ ] 实现预估剩余时间显示
- [ ] 实现当前评分器显示
- [ ] 支持取消运行（Ctrl+C）
- [ ] 优化交互式菜单体验
- [ ] 编写 CLI 集成测试

### 4.3 NPM Scripts
- [x] 添加 `pnpm eval` 脚本（交互式模式入口）
- [x] 验证所有参数模式正常工作
- [ ] 验证 CI 环境自动检测

### 4.4 可视化
- [x] 创建 HTML 评测报告模板
- [ ] 添加维度分数图表
- [ ] 创建历史结果趋势可视化
- [ ] 构建引擎对比仪表板

## 后续独立提案候选

- 在线评测指标与实时仪表板
- A/B 测试框架
- 人工评测平台和标注一致性计算

## 测试与验证

### 单元测试
- [ ] 测试数据格式适配器
- [ ] 测试 @mastra/evals 评分器集成
- [ ] 测试自定义评分器
- [ ] 测试报告生成器
- [ ] 测试 CLI 参数解析
- [ ] 测试模式检测逻辑
- [ ] 测试配置文件加载

### 集成测试
- [ ] 在样本数据集上测试完整评测运行
- [ ] 测试多引擎对比
- [ ] 测试回归检测
- [ ] 测试在线指标收集
- [ ] 测试会话回放和漂移检测
- [ ] 测试 CI/CD 流水线（非交互模式）

### 端到端测试
- [ ] 测试交互式 CLI 流程
- [ ] 测试命令行参数模式
- [ ] 测试混合参数场景
- [ ] 测试真实现 Agent 运行评测

### 验证
- [ ] 与人工专家评测对比验证
- [ ] 验证 LLM Judge 与人工评分的相关性
- [ ] 验证指标与用户满意度的一致性
- [ ] 验证 @mastra/evals 评分器的有效性
- [ ] 验证 CI/CD 环境下的正确行为
