# Change Proposal: migrate-to-deepagents

## Metadata

- **Change ID**: migrate-to-deepagents
- **Title**: 迁移投资顾问 Agent 到 DeepAgents.js
- **Status**: draft
- **Created**: 2026-01-30
- **Author**: AI Assistant

## Why

Current implementation of the investment advisor agent (`invest_consult.ts`) uses LangChain's `createAgent` function with a tool-based approach. While functional, this approach has limitations:

1. **Limited Planning & Decomposition**: LangChain's agent model uses a simple tool-calling loop without strategic task planning, making it harder to handle complex multi-step queries.
2. **No Sub-Agent Architecture**: Current implementation cannot delegate specialized work to focused sub-agents for better modularity.
3. **Over-engineered Graph Structure**: `InvestmentAdvisorGraph` uses a StateGraph with a single node that adds complexity without value.

Migrating to `deepagents` will provide:
- **Task Planning & Decomposition** - Break complex tasks into manageable steps
- **Sub-Agent Architecture** - Delegate specialized work to focused agents
- **File System Integration** - Persistent memory and state management
- **Streaming Support** - Real-time updates and progress tracking
- **Built on LangGraph** - Robust framework foundation while simplifying our code
- **Direct LangChain Tool Compatibility** - Reuse existing 6 tools without adaptation

## What Changes

- **ADD** dependency on `deepagents` package
- **ADD** unified `investmentAdvisorAgent.ts` with DeepAgent configuration, context builder, and chat method
- **ADD** new streaming implementation using DeepAgents.js native streaming
- **MODIFY** `chatService.ts` to directly call the unified agent instead of using InvestmentAdvisorGraph
- **DELETE** `InvestmentAdvisorGraph` (StateGraph with single node - over-engineered)
- **DELETE** `investmentChatState.ts` (state management - handled by DeepAgents internally)
- **PRESERVE** all 6 existing tools (Direct reuse - no adapter needed):
  - `stockSearchNewsTool`
  - `stockGetPriceTool`
  - `stockRecallMarketInfoTool`
  - `stockRecallCompanyInfoTool`
  - `noteQueryTool`
  - `TravilySearchTool`
- **PRESERVE** SSE streaming output format (OpenAI-compatible)
- **PRESERVE** error handling and logging patterns

## Non-Goals

- **NOT** migrating other graphs (`marketInformationGraph`, `scenarioAnalyzerGraph`, `diversificationGraph`, `aiInsightsGraph`)
- **NOT** replacing LangChain entirely (tools remain LangChain-based, DeepAgents directly uses them)
- **NOT** changing the API endpoint signatures or request/response schemas
- **NOT** modifying the database schema or service layer
- **NOT** adding new tools or capabilities beyond the migration
- **NOT** adding Skills architecture yet (DeepAgents supports it, but out of scope for this change)

## Impact

### Affected Specs
- `specs/chat-api/spec.md` - Update requirements for DeepAgents.js integration

### Affected Code
- `src/server/core/deepagents/investmentAdvisorAgent.ts` - NEW: Unified agent implementation
- `src/server/service/chatService.ts` - UPDATE: Simplified to direct agent call
- `src/server/core/graph/investmentAdvisorGraph/index.ts` - DELETE
- `src/server/core/graph/investmentAdvisorGraph/investmentChatState.ts` - DELETE
- `package.json` - Add `deepagents` dependency

### Success Criteria

1. **Functional Parity**: All 6 tools work identically to the current implementation
2. **Streaming Compatibility**: SSE streaming produces identical output format
3. **Planning Support**: Architecture supports task decomposition for complex queries
4. **Error Handling**: Errors are caught, logged, and returned gracefully
5. **Performance**: No regression in response time or throughput
6. **Type Safety**: All TypeScript types remain valid and strict
7. **Code Simplification**: Fewer files, less boilerplate, clearer flow

## Background

### Current Architecture (Over-engineered)

```
chatService.ts → InvestmentAdvisorGraph (StateGraph, 1 node)
                      ↓
              invest_consult node
                      ↓
              createAgent (LangChain)
                      ↓
              agent.stream() with manual parsing
                      ↓
              SSE Transform (OpenAI format)
```

**Problem**: StateGraph with only one node adds complexity without value.

### Target Architecture (Simplified)

```
chatService.ts → investmentAdvisorAgent.chat()
                      ↓
              createDeepAgent (DeepAgents.js)
                      ↓
              LangGraph-powered processing with planning
                      ↓
              Stream Adapter (OpenAI format)
```

**Benefits**:
- Direct call instead of graph wrapper
- Built-in planning and task decomposition
- Sub-agent capability for future expansion
- File system integration for persistence
- Direct LangChain tool compatibility (no adapter needed)

### Implementation Details

The new `investmentAdvisorAgent.ts` will:
1. Import all 6 existing LangChain tools directly
2. Create DeepAgent with `createDeepAgent({ tools, systemPrompt })`
3. Build context prompt with portfolio and risk analysis
4. Stream responses using `investmentDeepAgent.stream({ messages })`
5. Transform chunks to OpenAI-compatible SSE format

## Related References

- Existing spec: `specs/chat-api/spec.md`
- Tools location: `src/server/core/tools/`
- DeepAgents.js Documentation: https://github.com/reibsane/deepagents

## Migration Benefits Summary

### Before (Basic LangChain Agent with Graph Wrapper)
- Shallow loop: LLM calls tools in a simple loop
- No planning or task decomposition
- Over-engineered: StateGraph with single node
- Falls apart on complex multi-step tasks
- 4+ files for investment advisor logic

### After (DeepAgents.js)
- Smart planning: Decomposes complex tasks
- Sub-agent capability: Can delegate to specialized agents
- Simplified: Direct call, no unnecessary graph wrapper
- Persistent memory: File system integration
- Better consistency: LangGraph-powered state management
- Handles complex queries reliably
- Streaming support for real-time progress
- **Zero tool adaptation needed** - Directly reuses existing LangChain tools
- 1 unified file for investment advisor logic
