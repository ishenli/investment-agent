## 1. Core Types & Interfaces

- [ ] 1.1 创建 `packages/hermes-agent/src/observability/types.ts`
  - 定义 `ObservabilityConfig` 配置接口（含 sinks、pricing、callbacks）
  - 定义 `ObservabilitySink` 输出目标接口
  - 定义 `Span`、`Trace`、`MetricEvent` 数据结构
  - 定义 `ModelPricingTable` 模型定价配置类型

- [ ] 1.2 创建 `packages/hermes-agent/src/observability/index.ts`
  - 导出所有公开类型和接口
  - 创建 `createObservability()` 工厂函数

## 2. Structured Logger

- [ ] 2.1 创建 `packages/hermes-agent/src/observability/sinks/console-sink.ts`
  - 实现 `ConsoleSink` 类，输出格式化日志到控制台
  - 支持 JSON Lines 格式
  - 支持颜色模式和日志级别过滤

- [ ] 2.2 创建 `packages/hermes-agent/src/observability/sinks/file-sink.ts`
  - 实现 `FileSink` 类，输出日志到文件
  - 支持日志轮转配置
  - 支持异步写入和缓冲

## 3. Execution Tracer

- [ ] 3.1 创建 `packages/hermes-agent/src/observability/tracer.ts`
  - 实现 `Tracer` 类管理 span 生命周期
  - 提供 `startSpan()`、`endSpan()`、`addEvent()` 方法
  - 支持嵌套 span 和 parent-child 关系
  - TraceContext 通过显式参数传递（不依赖 AsyncLocalStorage）

## 4. Metrics Collector

- [ ] 4.1 创建 `packages/hermes-agent/src/observability/metrics.ts`
  - 实现 `MetricsCollector` 类
  - 记录 token 使用量（input/output/cached/reasoning）
  - 记录 API 调用延迟和次数
  - 记录工具调用频率和耗时

- [ ] 4.2 扩展现有 `packages/hermes-agent/src/budget.ts`
  - 复用现有 `IterationBudget` 类，不新增文件
  - 在 `IterationBudget` 上添加观测数据收集接口（迭代消耗、压缩次数）

## 5. Cost Tracker

- [ ] 5.1 创建 `packages/hermes-agent/src/observability/cost-tracker.ts`
  - 实现 `CostTracker` 类计算 API 成本
  - 接收外部注入的 `ModelPricingTable`（不内置定价表）
  - 缺失定价的模型使用零成本兜底，记录 warn 日志

- [ ] 5.2 创建 `packages/hermes-agent/src/observability/pricing.ts`
  - 定义 `ModelPricingTable` 数据结构
  - 提供 `calculateCost()` 工具函数
  - 支持不同价格类型（per million tokens）

## 6. Database Persistence（主项目）

- [ ] 6.1 追加数据库表定义到 `drizzle/schema/chat.ts`
  - 使用 Drizzle ORM 定义 `chatTraces` 和 `chatSpans` 表
  - 添加外键关联（`chat_sessions.id`、`chat_topics.id`）
  - 使用展开列存储核心指标（`totalTokens`, `inputTokens`, `outputTokens`, `totalCost`, `inputCost`, `outputCost`, `latencyMs`, `toolCallCount`）
  - 添加索引：`sessionId+createdAt`、`topicId`、`traceId`、`parentSpanId`
  - 使用 `{ mode: 'timestamp' }` 和 `$defaultFn(() => new Date())`
  - `chat_sessions` 和 `chat_traces` 外键使用 `onDelete: 'cascade'`
  - `chat_topics` 和 `chat_spans.parent_span_id` 外键使用 `onDelete: 'set null'`

- [ ] 6.2 在 `drizzle/schema/index.ts` 中导出新表
  - 导出 `chatTraces` 和 `chatSpans`
  - 运行 `pnpm db:generate` 生成迁移文件

- [ ] 6.3 创建 `src/server/repository/chat/trace.ts`
  - 实现 `TraceRepository` 继承 `BaseRepository`（字符串主键）
  - 将 `protected` 基类方法包装为 `public`（`create`, `findById`, `update`）
  - 实现 `findBySessionId()` 查询会话的所有 traces
  - 实现 `findByTopicId()` 查询话题的所有 traces

- [ ] 6.4 创建 `src/server/repository/chat/span.ts`
  - 实现 `SpanRepository` 继承 `BaseRepository`（字符串主键）
  - 将 `protected` 基类方法包装为 `public`
  - 实现 `findByTraceId()` 查询 trace 的所有 spans
  - 实现 `findByParentSpanId()` 查询子 spans

- [ ] 6.5 创建 `src/server/service/observabilityService.ts`
  - 接收 `hermes-agent` 的 callbacks 数据
  - 将 trace/span 数据写入数据库
  - 提供查询接口供 API 和 SSE 使用
  - 实现 `getSessionMetrics()` 汇总会话指标

## 7. Integration with Hermes Agent

- [ ] 7.1 更新 `packages/hermes-agent/src/types.ts`
  - 扩展 `AgentCallbacks` 添加 `onTraceStart`、`onSpanStart`、`onSpanEnd`、`onTraceEnd`、`onMetric`
  - 在 `AgentConfig` / `HermesAgentConfig` 中添加 `observability?: ObservabilityConfig`
  - 扩展 `HermesAgentResult` 添加可选的 `observability` 字段
  - 定义 `TraceStartEvent`、`SpanStartEvent`、`SpanEndEvent`、`TraceEndEvent`、`MetricEvent` 类型
  - 更新 `@typings/agentStream.ts` 扩展 `AgentStreamEvent` 联合类型，新增 `trace_start` / `span_start` / `span_end` / `trace_end` / `metric` 事件

- [ ] 7.2 更新 `packages/hermes-agent/src/loop.ts`
  - 在 `runAgentLoop()` 中接收可选的 `traceContext` 参数
  - 记录每次 LLM 调用的 span（含 token、延迟、成本）
  - 记录每次 tool call 的 span
  - 记录 context compression 事件
  - 发送 metrics 到 collector，触发 callbacks

- [ ] 7.3 更新 `packages/hermes-agent/src/agent.ts`
  - 在 `HermesAgentConfig` 中添加 `observability` 配置项
  - 在构造函数中初始化观测系统
  - 在 `run()` 方法中创建 trace context（显式传递）
  - 在 `HermesAgentResult` 中增加观测数据

- [ ] 7.4 更新 `packages/hermes-agent/src/index.ts`
  - 导出新增的观测相关类型和函数

## 8. API Endpoints

- [ ] 8.1 创建 `src/app/api/chat/observability/route.ts`
  - 实现 GET 端点获取当前会话观测数据汇总
  - 定义 Zod Schema 验证查询参数（`sessionId`, `from`, `to`）
  - 通过 `AuthService.getCurrentUserId()` 获取用户，校验 session 归属
  - 返回 token 统计、成本汇总、执行次数等
  - 使用 `ObservabilityService.getSessionMetrics()`

- [ ] 8.2 创建 `src/app/api/chat/traces/route.ts`
  - 实现 GET 端点获取当前会话 traces 列表
  - 定义 Zod Schema 验证查询参数（`page`, `limit`, `from`, `to`, `status`）
  - 校验用户只能查询自己的 session traces
  - 支持分页和时间范围过滤
  - 使用 `TraceRepository.findBySessionId()`

- [ ] 7.5 扩展 `src/server/core/engine/types.ts`
  - 在 `EngineRunContext` 中添加可选 `topicId?: string` 字段
  - 在 `EngineRunResult` 中添加可选 `observability?: {...}` 字段

- [ ] 8.3 修改 `src/server/core/agents/hermes/engine.ts`（核心集成点）
  - 在创建 `HermesAgentConfig.callbacks` 时合并观测回调
  - 从 `ctx.topicId` / `ctx.sessionId` 提取会话标识，注入 trace context
  - 在观测回调中调用 `ObservabilityService` 持久化数据（fire-and-forget：`.catch(err => logger.error(...))`）
  - 通过现有 `SSEEmitter` 推送观测事件
  - 从 `agent.run()` 结果中提取 `observability` 字段并包含在 `EngineRunResult` 返回值中

- [ ] 8.4 修改 `src/app/api/chat/hermes/route.ts`
  - 在 `HermesChatRequestSchema` 中添加 `topicId: z.string().optional()`
  - 将 `topicId` 传入 `runEngine()` 的 `ctx` 中

- [ ] 8.5 创建 `src/app/api/chat/observability-stream/route.ts`
  - 实现独立 SSE 端点，客户端可建立独立 EventSource 订阅观测事件
  - 复用 `SSEEmitter` 模式，支持 `trace_start` / `span_start` / `span_end` / `trace_end` / `metric`

## 9. Frontend Dashboard

- [ ] 9.1 创建 `src/app/(pages)/chat/components/ObservabilityPanel/index.tsx`
  - 可嵌入聊天页面的观测面板组件
  - 实时显示执行追踪
  - 使用 SSE 接收实时数据（复用现有 SSE 连接或建立新连接）

- [ ] 9.2 创建 `src/app/(pages)/chat/components/ObservabilityPanel/MetricsCard.tsx`
  - Token/cost/latency 关键指标卡片组件

- [ ] 9.3 创建 `src/app/(pages)/chat/components/ObservabilityPanel/TraceTimeline.tsx`
  - Trace 时间线可视化组件
  - 展示 span 层级结构和持续时间
  - 支持展开查看 span 详情

- [ ] 9.4 创建 `src/app/(pages)/chat/components/ObservabilityPanel/SpanDetail.tsx`
  - 展开的 span 详情组件

- [ ] 9.5 在聊天页面集成观测面板
  - 修改 `src/app/(pages)/chat/page.tsx` 或相关 layout
  - 添加观测 Tab 或可折叠侧边栏入口
  - 连接 SSE 实时数据流
  - 处理 `trace_start` / `span_start` / `span_end` / `trace_end` 事件类型

## 10. Pricing Configuration

- [ ] 10.1 创建 `src/server/config/modelPricing.ts`
  - 定义默认模型定价表
  - 包含主流模型（GPT-4o、Claude-3.5-Sonnet、Gemini 等）
  - 支持运行时更新定价

- [ ] 10.2 在 Hermes Engine 初始化时注入定价表
  - 在 `src/server/core/agents/hermes/engine.ts` 中配置 `observability.pricing`
  - 定价表从 `src/server/config/modelPricing.ts` 导入

## 11. Export & Documentation

- [ ] 11.1 更新 `packages/hermes-agent/src/index.ts`
  - 导出新增的观测相关类型和函数
  - 确保公开 API 清晰易用

- [ ] 11.2 创建 `packages/hermes-agent/OBSERVABILITY.md`
  - 编写观测系统使用文档
  - 包含配置示例和输出格式说明
  - 说明如何自定义 Sink
  - 包含前端集成指南（callbacks 模式）

## 12. Testing

- [ ] 12.1 创建 `packages/hermes-agent` 单元测试
  - 测试 `Tracer` span 生命周期管理
  - 测试 `MetricsCollector` 指标聚合
  - 测试 `CostTracker` 成本计算正确性（含外部 pricing 注入）
  - 测试 `ConsoleSink` / `FileSink` 输出逻辑

- [ ] 12.2 创建主项目测试
  - 测试 `observabilityService` 持久化逻辑
  - 测试 `traceRepository` / `spanRepository` 查询

- [ ] 12.3 创建集成测试
  - 测试 HermesAgent 集成后的完整观测流程
  - 验证 callbacks 被正确触发
  - 测试 SSE 实时推送（`observability_*` 事件）

## 13. Migration & Deployment

- [ ] 13.1 数据库迁移
  - 运行 `pnpm db:generate` 生成迁移
  - 检查迁移文件正确性
  - 执行 `pnpm db:migrate` 应用到开发数据库

- [ ] 13.2 验证向后兼容性
  - 确保 `observability` 配置为空时不影响现有行为
  - 确保现有 API 调用不受影响
  - 确保前端不启用观测面板时正常工作
