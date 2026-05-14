# Proposal: Update Reflection to Background Async Mode

## Why

当前 Reflection 机制在每次模型对话结束后同步执行，存在以下问题：
1. **阻塞主响应**：用户需等待 Reflection 完成才能收到响应，增加感知延迟
2. **资源竞争**：Reflection LLM 调用与主任务共享同一执行上下文
3. **扩展性差**：无法支持更长时、更复杂的反思分析

参考 Python hermes-agent 的实现，其使用 `_spawn_background_review()` 在后台线程中独立运行 review agent，完全不影响主对话流程。

## What Changes

1. **类型定义扩展** (`packages/hermes-agent/src/types.ts`)
   - 添加 `BackgroundReviewConfig` 配置项
   - 添加 `BackgroundReviewTrigger` 触发条件

2. **新增 BackgroundReviewer 类** (`packages/hermes-agent/src/reflection/background-reviewer.ts`)
   - 独立线程执行 reflection 审计
   - 共享主会话的消息快照
   - 支持可配置的触发间隔（基于 turn 数或 tool iterations）

3. **HermesAgent 集成** (`packages/hermes-agent/src/agent.ts`)
   - 移除同步 reflection 调用
   - 在 `run()` 结束时检查触发条件
   - 通过 `callbacks.onBackgroundReviewComplete` 通知结果

4. **Spec 更新** (`openspec/specs/hermes-agent/spec.md` 或新建)
   - 定义 Background Review 的行为规范
   - 说明触发机制和回调接口

## Impact

- **用户感知延迟降低**：主对话响应不再等待 Reflection
- **Reflection 可靠性提升**：独立线程，异常不影响主流程
- **向后兼容**：`reflectionConfig.enabled` 仍可关闭，默认行为不变
- **可观测性增强**：新增 `onBackgroundReviewComplete` 回调便于监控
