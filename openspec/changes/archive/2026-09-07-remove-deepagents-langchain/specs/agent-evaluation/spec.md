## MODIFIED Requirements

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
- **GIVEN** 多个 Agent 引擎（Claude、Hermes）
- **WHEN** 运行 `pnpm eval --compare claude,hermes`
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

### Requirement: Unified CLI Entry Point
系统 MUST 提供统一的交互式 CLI 入口，同时支持命令行参数模式，以适应日常开发和 CI/CD 自动化场景。

#### Scenario: 交互式模式运行评测
- **GIVEN** 用户在项目根目录
- **WHEN** 执行 `pnpm eval`（无参数）
- **THEN** 系统显示交互式菜单：
  - 选择评测类型（完整评测、类别评测、引擎对比、回归测试）
  - 选择评测类别（如选择了类别评测）
  - 选择引擎（如选择了引擎对比，仅列出 Hermes 或 Claude）
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
- **WHEN** 执行 `pnpm eval --compare claude,hermes`
- **THEN** 系统在指定引擎上运行评测
- **AND** 生成对比报告
- **AND** `--compare` 接受的值 MUST NOT 包含 `deepagents`

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
  - 支持的引擎列表（仅 Hermes、Claude）

#### Scenario: 显示评测状态和进度
- **GIVEN** 评测正在运行
- **WHEN** 查看终端输出
- **THEN** 系统：
  - 显示当前运行的类别和用例
  - 显示进度条（已完成/总数）
  - 显示预估剩余时间
  - 显示当前正在使用的评分器
  - 交互模式下支持取消（Ctrl+C）