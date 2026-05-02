# src/server/core 重构计划

## 当前问题

`src/server/core` 目录存在以下问题：

1. **模块边界模糊** - 多个 Agent 框架共存 (Hermes、Claude SDK、DeepAgents、LangGraph)，职责重叠
2. **废弃代码堆积** - `engine/`、`utils/` 等模块完全未被使用
3. **命名混乱** - `claude/` 既包含 Claude SDK 客户端，又包含工具构建，与 Anthropic Claude 品牌混淆
4. **依赖关系复杂** - 部分模块内部循环引用，外部导出路径不一致

## 模块状态分析

| 目录 | 状态 | 外部引用 | 说明 |
|------|------|---------|------|
| `agents/` | 活跃 | 0 (仅内部) | LangGraph multi-agent 实现，仅被 graph/tradeDecision 使用 |
| `claude/` | 活跃 | 3 | Claude SDK 集成，被 API 路由和 reportService 使用 |
| `deepagents/` | 活跃 | 2 | DeepAgents SDK 集成，被 chatService 和 aiInsightsGraph 使用 |
| `engine/` | **废弃** | 0 | 无任何引用，可安全删除 |
| `graph/` | 活跃 | 3 | LangGraph 工作流，被多个 service 使用 |
| `hermes/` | 活跃 | 2 | Hermes Agent 工具注册，被 API 和 channel 使用 |
| `memory/` | 活跃但空实现 | 0 (仅内部) | FinancialSituationMemory 实现，被 agents/ 使用但返回空数组 |
| `provider/` | 活跃 | 9 | ChatModel/ChatAgent 封装，被多处 graph 和 service 使用 |
| `tools/` | 半废弃 | 1 | 仅被 claude/buildTools 引用，应整合到 hermes |
| `utils/` | **废弃** | 0 | 无外部引用，可安全删除 |

详细引用分析：
- `agents/` → 仅被 `graph/tradeDecision/` 内部通过相对路径引用
- `claude/` → `@/server/core/claude/claudeClient`, `@server/core/claude/buildTools`, `@server/core/claude/toolNameMapper`
- `deepagents/` → `@/server/core/deepagents/investmentAdvisorAgent`, `deepagents` npm 包
- `graph/` → `@server/core/graph/aiInsightsGraph`, `@server/core/graph/tradeDecision`
- `hermes/` → `@server/core/hermes` (推荐路径)
- `provider/` → `@server/core/provider/chatModel`

---

## 重构方案

### Phase 1: 清理废弃代码 (低风险)

#### 1.1 删除 engine/ 目录
- **原因**: 无任何外部引用
- **文件**: `engine/hermes-engine.ts`, `engine/types.ts`, `engine/registry.ts`, `engine/index.ts`
- **影响**: 无

#### 1.2 删除 utils/ 目录
- **原因**: 无任何外部引用
- **文件**: `utils/agentUtils.ts`, `utils/messageUtils.ts`, `utils/stockUtils/`
- **影响**: 无

---

### Phase 2: 整合工具模块 (中等风险)

#### 2.1 合并 tools/ 到 hermes/

当前状态：
```
tools/
├── assetTool.ts
├── noteTool.ts
├── searchTool.ts
├── dbQueryTool.ts
└── stock/
    ├── stockGetPrice.ts
    ├── stockRecallMarketInfo.ts
    ├── stockRecallCompanyInfo.ts
    └── stockSearchNews.ts
```

目标状态：
```
hermes/
├── index.ts
├── registerBusinessTools.ts
└── tools/
    ├── asset.ts        # 从 tools/assetTool.ts 迁移
    ├── note.ts         # 从 tools/noteTool.ts 迁移
    ├── search.ts       # 从 tools/searchTool.ts 迁移
    ├── dbQuery.ts      # 从 tools/dbQueryTool.ts 迁移
    └── stock/
        ├── getPrice.ts
        ├── recallMarketInfo.ts
        ├── recallCompanyInfo.ts
        └── searchNews.ts
```

**步骤**:
1. 将 `tools/` 移动到 `hermes/tools/`
2. 更新 `hermes/registerBusinessTools.ts` 中的导入路径
3. 更新 `claude/buildTools.ts` 中的导入路径
4. 删除原 `tools/` 目录

---

### Phase 3: 重命名 claude/ 目录 (低风险)

#### 3.1 重命名为 claude-sdk/

**原因**: 
- 避免与 Anthropic Claude 品牌混淆
- 明确表示这是 SDK 集成层

**文件映射**:
```
claude/
├── claudeClient.ts      → claude-sdk/client.ts
├── buildTools.ts        → claude-sdk/tools.ts
├── platform.ts          → claude-sdk/platform.ts
├── conversationRegistry.ts → claude-sdk/conversation.ts
├── permissionRegistry.ts   → claude-sdk/permission.ts
├── toolNameMapper.ts    → claude-sdk/toolNames.ts
```

**更新导入路径**:
- `@/server/core/claude/claudeClient` → `@server/core/claude-sdk/client`
- `@server/core/claude/buildTools` → `@server/core/claude-sdk/tools`

---

### Phase 4: 整合 provider/ 目录 (中等风险)

#### 4.1 分析 provider/ 的职责

当前内容：
- `chatAgent.ts` - ChatClient 类，远程 Agent API 客户端
- `chatModel.ts` - chatModelOpenAI, ModelMap 等 LLM 模型封装

**问题**: 
- `chatAgent.ts` 与 `chatService.ts` 中的类似功能重复
- `chatModel.ts` 是 LangGraph 模型封装，仅被 graph/ 使用

**建议**:
1. 将 `chatModel.ts` 移动到 `graph/models.ts` (仅 graph 使用)
2. 将 `chatAgent.ts` 合并到 `service/chatService.ts` 或删除（需确认是否仍在使用）

---

### Phase 5: 整理 agents/ 和 graph/tradeDecision 的关系 (低风险)

#### 5.1 当前结构

```
agents/
├── analysts/       # market_analyst, news_analyst, fundamental_analyst
├── managers/       # research_manager, risk_manager
├── researchers/    # bull_researcher, bear_researcher
├── risk/           # safe_debator, aggressive_debator, neutral_debator
└── trader/         # trader

graph/tradeDecision/
├── tradingGraph.ts    # 主图编排
├── setup.ts           # Agent 创建函数
├── agentState.ts      # 状态定义
├── signalProcessor.ts # 信号处理节点
├── conditionalLogic.ts # 条件逻辑
├── propagation.ts     # 状态传播
├── reflection.ts      # 反思节点
├── endpoint.ts        # 端点定义
└── index.ts           # 导出
```

**问题**:
- `agents/` 和 `graph/tradeDecision/` 紧密耦合
- `setup.ts` 直接创建 `agents/` 中的 agent
- 外部只使用 `graph/tradeDecision`，不直接使用 `agents/`

**建议**:
1. 将 `agents/` 移动到 `graph/tradeDecision/agents/` 成为内部实现
2. 保持 `graph/tradeDecision/` 作为唯一的对外接口
3. `graph/tradeDecision/index.ts` 导出所有公开 API

---

### Phase 6: 完善 memory/ 或标记为 TODO (低风险)

#### 6.1 当前问题

```typescript
export class FinancialSituationMemory {
  get_memories(current_situation: string, n_matches: number = 1): MemoryItem[] {
    return []; // 空实现！
  }
}
```

**选项**:
1. **完善实现** - 如果确实需要记忆功能
2. **标记为 TODO** - 添加注释说明这是占位实现
3. **删除** - 如果不再需要

**建议**: 添加 TODO 注释，待后续决策

```typescript
/**
 * TODO: FinancialSituationMemory 是占位实现
 * 
 * 当前 get_memories() 返回空数组，需要实现：
 * - 向量化存储（如 Pinecone、Weaviate）
 * - 相似度搜索
 * - 持久化层
 * 
 * 相关讨论: https://github.com/xxx/issues/xxx
 */
```

---

### Phase 7: 更新导出和索引文件

#### 7.1 新的目录结构

```
src/server/core/
├── claude-sdk/           # Claude Agent SDK 集成
│   ├── client.ts
│   ├── tools.ts
│   ├── platform.ts
│   ├── conversation.ts
│   ├── permission.ts
│   ├── toolNames.ts
│   └── index.ts
├── deepagents/           # DeepAgents SDK 集成
│   └── investmentAdvisorAgent/
├── graph/                # LangGraph 工作流
│   ├── tradeDecision/
│   │   ├── agents/       # 内部 agent 实现
│   │   ├── models.ts     # 从 provider/chatModel.ts 移入
│   │   └── ...
│   ├── marketInformationGraph/
│   ├── aiInsightsGraph.ts
│   ├── diversificationGraph.ts
│   ├── scenarioAnalyzerGraph.ts
│   ├── strategyAdviceGraph.ts
│   ├── abstractGraph.ts
│   └── index.ts
├── hermes/               # Hermes Agent 集成
│   ├── tools/
│   │   ├── asset.ts
│   │   ├── note.ts
│   │   ├── search.ts
│   │   ├── dbQuery.ts
│   │   └── stock/
│   ├── registerBusinessTools.ts
│   └── index.ts
├── memory/               # (TODO: 需要实现或删除)
│   └── index.ts
└── index.ts              # 统一导出
```

#### 7.2 根 index.ts 规范

```typescript
/**
 * Server Core - Agent Orchestration Layer
 *
 * This directory contains integrations with multiple agent frameworks:
 * - Hermes Agent: Primary agent framework for chat and WeChat channel
 * - Claude SDK: Anthropic Claude Agent SDK integration
 * - DeepAgents: Alternative agent framework for investment advisory
 * - LangGraph: Multi-agent workflow orchestration
 *
 * External modules should import from specific subdirectories:
 *   import { registerBusinessTools } from '@server/core/hermes';
 *   import { streamClaude } from '@server/core/claude-sdk/client';
 *   import { aiInsightsGraph } from '@server/core/graph';
 */

// Public APIs
export { registerBusinessTools } from './hermes';
export { streamClaude } from './claude-sdk/client';
export { aiInsightsGraph, tradeDecisionGraph } from './graph';

// Types (if needed externally)
export type { MemoryItem, FinancialSituationMemory } from './memory';
```

---

## 执行顺序

| 阶段 | 任务 | 风险 | 预计时间 | 依赖 |
|------|------|------|---------|------|
| 1.1 | 删除 engine/ | 低 | 5min | 无 |
| 1.2 | 删除 utils/ | 低 | 5min | 无 |
| 2.1 | 合并 tools/ 到 hermes/ | 中 | 30min | 无 |
| 3.1 | 重命名 claude/ → claude-sdk/ | 低 | 20min | 无 |
| 4.1 | 整合 provider/ | 中 | 1h | 需确认 chatAgent 用途 |
| 5.1 | 整理 agents/ 到 graph/tradeDecision/agents/ | 低 | 30min | 无 |
| 6.1 | 标记 memory/ 为 TODO | 低 | 5min | 无 |
| 7.1 | 更新所有导入路径 | 中 | 1h | 1-6 完成 |
| 7.2 | 添加模块文档 | 低 | 30min | 7.1 完成 |

**总预计时间**: 4-5 小时

---

## 风险评估

### 低风险
- 删除 `engine/` 和 `utils/`: 无外部引用
- 重命名 `claude/`: 仅 3 个文件引用
- 标记 `memory/` 为 TODO: 无功能影响

### 中等风险
- 合并 `tools/` 到 `hermes/`: 需要更新 `claude/buildTools.ts`
- 整合 `provider/`: 影响多个 graph 和 service
- 更新导入路径: 需要完整的 TypeScript 重构支持

### 需要确认
- `provider/chatAgent.ts` 是否仍在使用？被 `chatService.ts` 和 `finnhubUtil.ts` 引用
- `memory/FinancialSituationMemory` 是否计划实现？

---

## 验证清单

- [ ] TypeScript 编译通过 (`npx tsc --noEmit`)
- [ ] 所有测试通过 (`pnpm test`)
- [ ] 无运行时错误 (启动 dev server)
- [ ] API 路由正常工作 (手动测试关键端点)
- [ ] 导入路径正确更新 (IDE 跳转正常)

---

## 后续建议

1. **统一 Agent 框架选择** - 考虑是否需要同时维护 Hermes、Claude SDK、DeepAgents 三个框架
2. **建立模块边界规范** - 使用 `index.ts` 限制对外暴露的 API
3. **添加依赖关系图** - 使用工具 (如 madge) 生成模块依赖图
4. **定期清理废弃代码** - 建立代码审查流程
