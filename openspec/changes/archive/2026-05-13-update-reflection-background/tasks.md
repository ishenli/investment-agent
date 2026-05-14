# Tasks: Update Reflection to Background Async Mode

## 1. Type Definitions
- [x] 1.1 Define `BackgroundReviewConfig` interface in `types.ts`
- [x] 1.2 Define `BackgroundReviewTrigger` type
- [x] 1.3 Update `ReflectionConfig` to include background options

## 2. BackgroundReviewer Implementation
- [x] 2.1 Create `packages/hermes-agent/src/reflection/background-reviewer.ts`
- [x] 2.2 Implement `BackgroundReviewer` class with thread-safe execution
- [x] 2.3 Implement message snapshot isolation
- [x] 2.4 Implement trigger condition checks (turn count, iteration count)
- [x] 2.5 Add full observability support (TraceContext, spans, metrics)

## 3. HermesAgent Integration
- [x] 3.1 Remove synchronous reflection from main path (only run when backgroundMode=false)
- [x] 3.2 Add background review trigger logic after main turn completes
- [x] 3.3 Wire up `onBackgroundReviewComplete` callback
- [x] 3.4 Share observability components (bus, tracer, metrics) with BackgroundReviewer

## 4. Observability Enhancements
- [x] 4.1 Add reflection-related MetricName types
- [x] 4.2 Add background_review related SpanName types  
- [x] 4.3 Add reflection metrics to TraceMetrics interface
- [x] 4.4 Instrument BackgroundReviewer with full tracing

## 5. Documentation
- [x] 5.1 Update spec document with background review behavior
- [ ] 5.2 Add usage examples to README
- [ ] 5.3 Add unit tests for trigger conditions
- [ ] 5.4 Add integration tests for background review flow
