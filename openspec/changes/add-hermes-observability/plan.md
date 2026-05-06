# Implementation Plan: Hermes Observability System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     HermesAgent (npm package)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Observability                        │   │
│  │  ┌───────────┐  ┌───────────┐  ┌──────────────────┐ │   │
│  │  │  Tracer   │  │  Metrics  │  │  CostTracker     │ │   │
│  │  │  (spans)  │  │(counters) │  │  (pricing)       │ │   │
│  │  └─────┬─────┘  └─────┬─────┘  └────────┬─────────┘ │   │
│  │        └──────────────┼─────────────────┘           │   │
│  │                       ▼                             │   │
│  │                 ObservabilityBus                     │   │
│  │                       │                               │   │
│  │        ┌──────────────┼──────────────┐               │   │
│  │        ▼              ▼              ▼               │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐     │   │
│  │  │ConsoleSink│  │ FileSink  │  │  Callbacks    │     │   │
│  │  └───────────┘  └───────────┘  └───────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │  AgentCallbacks.onTraceEnd / onMetric
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       Main Project                           │
│  ┌───────────────┐     ┌──────────────────┐               │
│  │ Observability │     │  API Routes      │               │
│  │  Service      │     │/api/chat/observability          │
│  │               │     │/api/chat/traces                 │
│  │  - Persist    │     │/api/chat/observability-stream    │
│  │  - Query      │     └──────────────────┘              │
│  │               │                  │                     │
│  └───────┬───────┘                  ▼                     │
│          │                  ┌──────────────┐               │
│          │                  │ Frontend UI  │               │
│          └─────────────────▶│  (Panel)     │               │
│                             └──────────────┘               │
└─────────────────────────────────────────────────────────────┘

Note: HermesAgent is instantiated inside src/server/core/agents/hermes/engine.ts,
      NOT directly in the API route. Observability callbacks and config MUST be
      injected at the engine layer to ensure they reach the agent.
```

## Key Design Decisions

### 1. Sink + Callback Architecture
采用 Sink 接口抽象输出目标，同时提供 Callback 接口供主项目消费：
- `ConsoleSink`：开发调试，彩色格式化输出
- `FileSink`：生产环境，JSON Lines 持久化
- `Callbacks`（`onTraceEnd`, `onMetric`, `onSpanEnd`）：供主项目接收事件后自行持久化
- `OpenTelemetrySink`（未来）：集成 Prometheus/Jaeger

### 2. Trace Context Explicit Passing
追踪上下文通过显式参数传递（替代 AsyncLocalStorage，保证浏览器/Node/Electron 兼容）：
```
agent.run(input, config, traceContext?)
  └── runAgentLoop(..., traceContext)
       ├── startSpan('llm_call', traceContext)
       ├── startSpan('tool_call', traceContext)
       └── endTrace(traceContext)
```

### 3. Minimal Intrusion
观测代码对现有逻辑的最小侵入：
- 通过 `AgentCallbacks` 扩展注入观测钩子
- 观测逻辑集中在 `Tracer` 和 `MetricsCollector` 中
- 不修改核心 agent loop 的控制流

### 4. External Pricing Table
成本计算依赖外部注入的定价表，不在包内硬编码：
```typescript
const pricing: ModelPricingTable = {
  'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'claude-3-5-sonnet': { inputPerMillion: 3, outputPerMillion: 15 },
  // ...更多模型
};
```

主项目负责维护和更新定价表，可在运行时动态更新。

### 5. Database Schema Design
新增两张独立表，通过外键关联现有 `chat_sessions` 和 `chat_topics`：

```sql
-- chat_traces: 观测 trace 记录
CREATE TABLE chat_traces (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES chat_topics(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'running' | 'completed' | 'error'
  total_tokens INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  input_cost REAL NOT NULL DEFAULT 0,
  output_cost REAL NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  tool_call_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  metadata TEXT,        -- JSON: extensible metadata (model, provider)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_traces_session_created ON chat_traces(session_id, created_at);
CREATE INDEX idx_traces_topic ON chat_traces(topic_id);

-- chat_spans: 观测 span 记录
CREATE TABLE chat_spans (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL REFERENCES chat_traces(id) ON DELETE CASCADE,
  parent_span_id TEXT REFERENCES chat_spans(id) ON DELETE SET NULL,
  name TEXT NOT NULL,        -- 'llm_call' | 'tool_call' | 'context_compression'
  kind TEXT NOT NULL,        -- 'client' | 'internal'
  status TEXT NOT NULL,      -- 'ok' | 'error'
  attributes TEXT,           -- JSON: span-specific metadata
  events TEXT,               -- JSON: array of events
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  duration_ms INTEGER,
  token_input INTEGER,
  token_output INTEGER,
  cost REAL
);
CREATE INDEX idx_spans_trace ON chat_spans(trace_id);
CREATE INDEX idx_spans_parent ON chat_spans(parent_span_id);
```

## Integration with Existing Infrastructure

### 1. Hermes Engine Integration

观测系统集成点位于 `src/server/core/agents/hermes/engine.ts`，因为 `HermesAgent`
在此文件中实例化并运行。route.ts 仅调用 `runEngine()` 并不直接操作 agent。

集成策略：

```typescript
// 在 src/server/core/agents/hermes/engine.ts 中创建 callbacks
const observabilityCallbacks = {
  onTraceStart: (trace) => {
    // fire-and-forget: persist trace without awaiting
    observabilityService.createTrace(trace).catch(err => logger.error('[HermesEngine] persist trace failed:', err));
    emitter.send({ type: 'trace_start', trace });
  },
  onSpanStart: (span) => {
    // fire-and-forget
    observabilityService.createSpan(span).catch(err => logger.error('[HermesEngine] persist span failed:', err));
    emitter.send({ type: 'span_start', span });
  },
  onSpanEnd: (span) => {
    observabilityService.updateSpan(span).catch(err => logger.error('[HermesEngine] update span failed:', err));
    emitter.send({ type: 'span_end', span });
  },
  onTraceEnd: (trace) => {
    observabilityService.updateTrace(trace).catch(err => logger.error('[HermesEngine] update trace failed:', err));
    emitter.send({ type: 'trace_end', trace });
  },
  onMetric: (metric) => {
    emitter.send({ type: 'metric', metric });
  },
};

// 传入 HermesAgent
const agent = new HermesAgent({
  ...existingConfig,
  callbacks: {
    ...existingCallbacks,
    ...observabilityCallbacks,
  },
  observability: {
    enabled: true,
    sinks: [new ConsoleSink()],
    pricing: modelPricingConfig,
  },
});
```

**关键点**：
- 集成点必须在 engine.ts，因为 `HermesAgent` 在此实例化
- 持久化操作使用 `fire-and-forget`（`.catch()`），避免阻塞 agent loop
- 复用现有 `SSEEmitter` 实例推送观测事件
- `EngineRunResult` 须从 agent result 中提取 observability 字段并返回给 runner
- topicId 通过 `ctx` 显式传给 engine（需在 `EngineRunContext` 中扩展 `topicId?` 字段）
- 路由层只需在 `runEngine(ctx, emitter)` 的 `ctx` 中附加 `topicId`

### 2. AgentCallbacks Extension

扩展现有 `AgentCallbacks` 接口（向后兼容）：

```typescript
// packages/hermes-agent/src/types.ts
export interface AgentCallbacks {
  // 现有回调（保持不变）
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

### 3. HermesAgentResult Extension

扩展结果类型以包含观测数据：

```typescript
// packages/hermes-agent/src/types.ts
export interface HermesAgentResult {
  // 现有字段（保持不变）
  context: Context;
  completed: boolean;
  apiCalls: number;
  finalResponse: string;
  error?: string;

  // 新增观测字段（可选）
  observability?: {
    traceId: string;
    durationMs: number;
    tokens: { input: number; output: number; total: number };
    cost: number;
    toolCalls: number;
  };
}
```

### 4. Session/Topic ID Passing

topicId 通过 `EngineRunContext` 显式传给 engine，而非通过 `streamOptions`：

```typescript
// 1. 扩展引擎上下文类型
// src/server/core/engine/types.ts
export interface EngineRunContext {
  // 现有字段...
  sessionId: string;
  /** 可选：当前 topic ID，用于 observability 关联 */
  topicId?: string;
  // ...
}

// 2. 扩展路由请求体以接收 topicId
// src/app/api/chat/hermes/route.ts — HermesChatRequestSchema
const HermesChatRequestSchema = z.object({
  // 现有字段...
  topicId: z.string().optional(), // 新增
});

// 3. engine 从 ctx 提取 topicId 传给 observability
// src/server/core/agents/hermes/engine.ts
const { sessionId, topicId } = ctx;

// traceId / topicId 注入 Tracer
const traceContext = {
  sessionId,
  topicId,
  traceId: generateTraceId(),
};
```

### 5. Database Migration Strategy

使用项目标准数据库迁移命令：

```bash
# 生成迁移文件
pnpm db:generate

# 应用到开发数据库
pnpm db:migrate
```

迁移文件将包含：
- `chat_traces` 表创建
- `chat_spans` 表创建
- 外键约束
- 索引创建

**回滚策略**：保留回滚迁移，删除新增表即可。

> **Schema 存放位置**：新增表定义追加至 `drizzle/schema/chat.ts`（与现有 chat 表保持一致），
> 或在同目录新建 `drizzle/schema/chat-observability.ts`，然后在 `drizzle/schema/index.ts` 中统一导出。

## Data Flow

### Trace Creation Flow
```
User Message → HermesAgent.run()
                ↓
          Tracer.startTrace()
                ↓
          Callback: onTraceStart(sessionId, topicId)
                ↓
          Main Project: ObservabilityService.createTrace()
                ↓
          Database: INSERT INTO chat_traces
```

### Span Lifecycle
```
LLM Call Start → Tracer.startSpan('llm_call')
                      ↓
                Callback: onSpanStart()
                      ↓
                Main Project: ObservabilityService.createSpan()
                      ↓
                Database: INSERT INTO chat_spans

LLM Call End → Tracer.endSpan()
                    ↓
              MetricsCollector.record()
                    ↓
              CostTracker.calculate()
                    ↓
              Callback: onSpanEnd()
                    ↓
              Main Project: ObservabilityService.updateSpan()
                    ↓
              Database: UPDATE chat_spans SET end_time=?, duration_ms=?
```

### Real-time Updates
1. Agent run starts → callback `onTraceStart` → service persists trace → emit SSE `trace_start`
2. Each span created → callback `onSpanStart` → service stores span → emit SSE `span_start`
3. Span ends → callback `onSpanEnd` → service updates span → emit SSE `span_end`
4. Trace ends → callback `onTraceEnd` → service updates trace → emit SSE `trace_end`

Frontend uses EventSource to receive SSE events and updates UI in real-time.

### UI Mockup
```
┌─────────────────────────────────────────────────────────────┐
│ Observability                                        [Live] │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│ │ Tokens   │ │ Cost     │ │ Latency  │ │ Tools Called     ││
│ │ 12,847   │ │ $0.0423  │ │ 8.2s     │ │ 7 calls          ││
│ │ ↑ +2,103 │ │ ↑ +$0.01 │ │ avg 1.2s │ │ search, read... ││
│ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Execution Timeline                                          │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ▶ LLM Call (gpt-4o)                    2.1s  847+156 tok││
│ │   └─ Tool: search_files                0.3s  ✓         ││
│ │ ▶ LLM Call (gpt-4o)                    1.8s  1203+89 tok││
│ │   └─ Tool: read_file                   0.1s  ✓         ││
│ │ ▶ Context Compression                  0.2s  -4,200 tok││
│ │ ▶ LLM Call (gpt-4o)                    2.5s  1520+245 tok││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### GET /api/chat/observability
Returns aggregated observability metrics for the current session.

Response:
```json
{
  "sessionMetrics": {
    "totalTraces": 15,
    "totalTokens": 128470,
    "totalCost": 0.423,
    "avgLatency": 7.8,
    "totalToolCalls": 42
  },
  "recentTraces": [...]
}
```

### GET /api/chat/traces
Returns paginated list of traces with optional filters.

Query params:
- `page`, `limit` - pagination
- `from`, `to` - time range
- `status` - filter by status

### GET /api/chat/observability-stream (SSE)
Real-time event stream for observability updates.

Event types:
- `trace_start` - new trace created
- `span_start` - span started
- `span_end` - span completed
- `trace_end` - trace completed
- `metric` - metric update (tokens, cost)

**注意**：此 SSE 端点独立于 hermes chat 的 SSE 流。前端可选择复用现有 SSE 连接
（通过 engine 内 emit 到同一 `SSEEmitter`），也可建立独立 EventSource。

## Implementation Phases

### Phase 1: Core Observability (Backend)
1. Types and interfaces
2. Tracer and Metrics
3. Cost Tracker (with external pricing)
4. Console/File Sinks
5. Hermes Agent integration (explicit trace context)

### Phase 2: Main Project Persistence & API
6. Database schema (Drizzle ORM in main project)
7. Repository layer (traceRepository, spanRepository)
8. Observability service (receive callbacks, persist to DB)
9. REST API endpoints
10. SSE streaming endpoint

### Phase 3: Frontend
11. ObservabilityPanel component
12. TraceTimeline visualization
13. Metrics cards
14. Chat page integration (Tab / sidebar entry)

## File Structure

```
packages/hermes-agent/
├── src/
│   ├── observability/
│   │   ├── index.ts              # 公开导出
│   │   ├── types.ts              # 类型定义
│   │   ├── tracer.ts             # Tracer 类
│   │   ├── metrics.ts            # MetricsCollector 类
│   │   ├── cost-tracker.ts       # CostTracker 类
│   │   ├── pricing.ts            # 定价工具函数
│   │   └── sinks/
│   │       ├── index.ts
│   │       ├── console-sink.ts   # ConsoleSink
│   │       └── file-sink.ts      # FileSink
│   ├── types.ts                  # 扩展 AgentCallbacks / HermesAgentResult
│   ├── index.ts                  # 导出 observability
│   └── budget.ts                 # 复用现有 IterationBudget（不新增 budget-tracker）
│
src/
├── drizzle/
│   └── schema/
│       └── chat.ts               # 追加 chat_traces, chat_spans 表定义
├── server/
│   ├── repository/
│   │   ├── chat/
│   │   │   ├── trace.ts          # TraceRepository（继承 BaseRepository，public 包装）
│   │   │   ├── span.ts           # SpanRepository（继承 BaseRepository，public 包装）
│   │   │   └── index.ts          # barrel 导出
│   │   └── chat/
│   │       └── index.ts          # 导出 chat/ 下所有 repository
│   └── service/
│       └── observabilityService.ts
├── app/
│   └── api/chat/
│       ├── observability/
│       │   └── route.ts          # GET 汇总接口
│       ├── traces/
│       │   └── route.ts          # GET 列表接口
│       └── observability-stream/
│           └── route.ts          # SSE 流接口
└── app/(pages)/chat/
    └── components/ObservabilityPanel/
        ├── index.tsx
        ├── MetricsCard.tsx
        ├── TraceTimeline.tsx
        └── SpanDetail.tsx
```

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 作为开发者，我可以在 Hermes Agent 运行后看到本次执行的 token 消耗、API 成本和延时，以便了解 AI 调用开销 | EngineRunResult 返回 observability 字段；SSE `result` 事件包含 tokens/cost |
| P2 | 作为用户，我可以在聊天页面查看当前会话的观测面板（Metrics 卡片 + 执行 Timeline），了解 AI 执行过程 | 前端 ObservabilityPanel 正常渲染实时数据 |
| P3 | 作为用户，我可以查看历史 trace 列表和详情，对比不同对话的执行效率 | `/api/chat/traces` 返回分页数据；点击后展示 span 详情 |

## 复杂性跟踪

> **本无引入架构违规**

| 触发项 | 为何需要 | 更简单的替代方案及拒绝原因 |
|--------|---------|---------------------------|
| 新增 `chat_traces` / `chat_spans` 表 | 观测数据需要持久化以支持跨会话历史查询和 SQL 聚合 | 仅内存存储无法持久化；仅文件日志无法做关联查询 |
| 新增独立 SSE 端点 `observability-stream` | Next.js App Router 中 `/observability/route.ts` 和 `/observability/stream/route.ts` 路径冲突 | 复用 hermes chat SSE 通道更简单，但独立端点允许非聊天场景订阅观测事件 |
| 显式 traceContext 参数传递（替代 AsyncLocalStorage） | 项目需要在浏览器（Electron renderer）和 Node 环境同时运行，AsyncLocalStorage 在浏览器不可用 | — |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 回调 fire-and-forget 导致 DB 写入失败但无感知 | 中 | 所有 `.catch()` 必须记录 `logger.error`，并在 ObservabilityService 内实现重试/降级 |
| 观测事件高频 emit 拖慢 SSE 流 | 中 | Span 级别事件采样（配置 `sampleRate`）；合并高频 metric 事件为批量推送 |
| `EngineRunContext.topicId` 扩展影响其他 engine（claude/deepagents） | 低 | topicId 设为可选字段，仅在 hermes engine 中读取 |
| 大量 trace/span 数据导致数据库膨胀 | 中 | 实现自动清理策略（保留最近 N 天）；对大表的 `created_at` 索引优化查询性能 |

## 性能考虑

- **观测写入延迟**：DB 写入使用 fire-and-forget，目标 < 5ms 额外开销 per callback
- **SSE 事件频率**：metric 事件批量推送（每 500ms 或 10 个事件聚合一次），避免每 token 都 emit
- **前端渲染**：Timeline 组件使用虚拟滚动，支持 1000+ spans 无卡顿
- **SQL 查询优化**：利用 `chat_traces` 的 `total_cost` / `total_tokens` 列直接做 `SUM` / `AVG`，避免 JSON 解析

## 安全考虑

- **归属校验**：所有观测查询 API 必须校验 `session.userId === currentUserId`，防止越权查看他人 trace
- **敏感信息脱敏**：Span `attributes` 中的 tool arguments 可能包含敏感数据，存入 `metadata` / `attributes` 时须过滤（禁止记录 API Key、密码）
- **Sink 安全**：`FileSink` 写入路径应限制在项目工作区内，防止路径遍历

## 测试策略

- **单元测试**（packages/hermes-agent）：
  - `Tracer.startSpan` / `endSpan` 生命周期断言
  - `CostTracker` 正确性（已知 pricing + 已知 token → 验证 cost）
  - `MetricsCollector` 聚合后数值正确
  - Callback 触发次数和参数结构断言

- **集成测试**（主项目）：
  - `ObservabilityService` 写入和查询 DB 流程
  - `TraceRepository` / `SpanRepository` CRUD + 外键约束
  - API 端点 Zod 验证、归属校验、分页

- **端到端验证**：
  - 触发一次 Hermes chat → 验证 `chat_traces` / `chat_spans` 有记录
  - SSE 流中接收到 `trace_start` / `span_end` 事件
  - Frontend Panel 中 Metrics 卡片数值与数据库一致
