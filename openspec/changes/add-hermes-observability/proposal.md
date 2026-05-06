## Why

Hermes Agent 当前缺乏系统性的观测能力，难以追踪：
- Agent 执行流程和工具调用情况
- LLM API 调用的 token 消耗和延迟
- 执行成本和错误监控
- 性能瓶颈和调试信息

这导致问题排查困难、成本不可见、性能无法优化。

## What Changes

在 `packages/hermes-agent` 中添加一套模块化的观测系统，并在前端提供可视化界面：

### Backend (packages/hermes-agent)

1. **Observability Core** - 核心观测接口与数据结构
   - 定义 `ObservabilityConfig`、`ObservabilitySink`、`Span`、`Metric` 类型
   - 支持多个 Sink 输出（控制台、文件）和回调接口

2. **Structured Logger** - 结构化 JSON 日志
   - 输出 JSON Lines 格式到文件和控制台
   - 支持日志级别过滤和采样

3. **Execution Tracer** - 执行追踪
   - 记录每次 agent run 的完整生命周期
   - 跟踪 tool calls、LLM calls、上下文压缩事件
   - 生成 span 和 trace ID 用于关联分析

4. **Metrics Collector** - 指标收集
   - Token 使用量（input/output/total）
   - API 调用次数和延迟
   - 工具调用频率和耗时
   - 预算消耗和压缩次数

5. **Cost Tracker** - 成本追踪
   - 基于外部注入的模型定价表计算每次 API 调用成本
   - 累计 session 级别成本
   - 定价表由消费方（主项目）配置注入，不内置于包中

6. **Database Persistence**（主项目）- 数据库持久化
   - 通过 `AgentCallbacks` 回调接口将 trace 数据暴露给主项目
   - 主项目负责写入 SQLite（Drizzle ORM）并支持历史查询
   - `packages/hermes-agent` 不直接依赖数据库

### Frontend (src/app)

7. **Observability Dashboard** - 观测仪表板
   - 新增聊天页内嵌的 Observability Panel
   - 实时显示当前会话的执行追踪
   - 展示 token 消耗、成本、延迟等指标

8. **API Endpoints** - API 端点
   - `GET /api/chat/observability` - 获取当前会话观测数据汇总
   - `GET /api/chat/traces` - 获取当前会话执行追踪列表（支持分页和过滤）
   - `GET /api/chat/observability-stream` - SSE 实时推送观测事件

## Integration with Existing Infrastructure

### 1. Hermes Engine Integration

观测系统与现有 `src/server/core/agents/hermes/engine.ts` 集成（HermesAgent 在此实例化）：

- **Session/Topic ID 传递**：通过 `EngineRunContext` 传入 `sessionId` 和可选的 `topicId`，用于关联 trace 数据
- **SSE 基础设施复用**：利用现有 `SSEEmitter` 类推送观测事件
- **事件类型扩展**：在现有 `AgentStreamEvent` 基础上新增观测事件类型（`trace_start`、`span_start`、`span_end`、`trace_end`、`metric`）
- **向后兼容**：观测回调为可选参数，不影响现有调用方式
- **持久化策略**：回调中使用 fire-and-forget 模式（`.catch()` 处理错误），避免阻塞 agent 执行循环

### 2. Database Schema Migration

新增两张独立的观测表，与现有 `chat_*` 表建立外键关联：

- `chat_traces` - 观测 trace 记录
  - 外键关联 `chat_sessions.id`（通过 session_id）
  - 外键关联 `chat_topics.id`（通过 topic_id，可选）
  - 索引：`(session_id, created_at)`、`topic_id`

- `chat_spans` - 观测 span 记录
  - 外键关联 `chat_traces.id`（通过 trace_id）
  - 自引用外键 `parent_span_id`
  - 索引：`trace_id`、`parent_span_id`

**迁移策略**：
- 使用 Drizzle Kit 生成迁移文件
- 新表创建不影响现有数据
- `chat_sessions.id` 和 `chat_traces.id` 外键使用 `onDelete: 'cascade'`
- `chat_topics.id` 和 `chat_spans.parent_span_id` 外键使用 `onDelete: 'set null'`

### 3. Callbacks Extension

扩展现有 `AgentCallbacks` 接口（位于 `packages/hermes-agent/src/types.ts`）：

```typescript
export interface AgentCallbacks {
  // 现有回调
  onToolStart?: (name: string, args: Record<string, unknown>) => void;
  onToolEnd?: (result: ToolCallResult) => void;
  onError?: (error: Error) => void;
  onStep?: (iteration: number, toolNames: string[]) => void;
  onTextDelta?: (delta: string) => void;
  
  // 新增观测回调（可选）
  onTraceStart?: (trace: TraceStartEvent) => void;
  onSpanStart?: (span: SpanStartEvent) => void;
  onSpanEnd?: (span: SpanEndEvent) => void;
  onTraceEnd?: (trace: TraceEndEvent) => void;
  onMetric?: (metric: MetricEvent) => void;
}
```

### 4. Result Enrichment

扩展 `HermesAgentResult`（位于 `packages/hermes-agent/src/types.ts`）：

```typescript
export interface HermesAgentResult {
  context: Context;
  completed: boolean;
  apiCalls: number;
  finalResponse: string;
  error?: string;
  
  // 新增观测数据（可选）
  observability?: {
    traceId: string;
    durationMs: number;
    tokens: { input: number; output: number; total: number };
    cost: number;
    toolCalls: number;
  };
}
```

## Impact

- **开发体验**：结构化日志便于调试和问题定位
- **成本控制**：可视化 token 消耗和 API 成本
- **性能优化**：识别慢工具和 API 延迟瓶颈
- **向后兼容**：观测系统为可选功能，默认不启用时不影响现有行为
- **用户体验**：用户可以看到 AI 执行过程的透明度，了解成本消耗
- **Schema 变更**：新增两张数据库表，需要执行迁移，不影响现有表结构
