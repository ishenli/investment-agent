# Technical Design: Migrate to DeepAgents.js

## 1. Current Architecture (LangChain Basic Agent)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    invest_consult.ts (Current)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐    ┌──────────────────┐    ┌──────────────┐   │
│  │  System Prompt  │    │  Chat History    │    │  User Query  │   │
│  └────────┬────────┘    └────────┬─────────┘    └──────┬───────┘   │
│           │                      │                     │           │
│           └──────────────────────┼─────────────────────┘           │
│                                  ▼                                  │
│                        ┌─────────────────┐                          │
│                        │  createAgent()  │                          │
│                        │  (LangChain)    │                          │
│                        └────────┬────────┘                          │
│                                 │                                   │
│                                 ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      Tools (6 total)                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    │   │
│  │  │stockSearch  │ │stockGetPrice│ │stockRecallMarketInfo│    │   │
│  │  │NewsTool     │ │Tool         │ │Tool                 │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    │   │
│  │  │stockRecall  │ │noteQueryTool│ │TravilySearchTool    │    │   │
│  │  │CompanyInfo  │ │             │ │                     │    │   │
│  │  │Tool         │ │             │ │                     │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                 │                                   │
│                                 ▼                                   │
│                        ┌─────────────────┐                          │
│                        │ agent.stream()  │                          │
│                        │ (manual parse)  │                          │
│                        └────────┬────────┘                          │
│                                 │                                   │
│                                 ▼                                   │
│                        ┌─────────────────┐                          │
│                        │  SSE Transform  │                          │
│                        │  (OpenAI format)│                          │
│                        └────────┬────────┘                          │
│                                 │                                   │
│                                 ▼                                   │
│                        ┌─────────────────┐                          │
│                        │  send() to SSE  │                          │
│                        └─────────────────┘                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Limitations of Current Architecture:**
- LLM simply calls tools in a loop without strategic planning
- No task decomposition for complex queries
- Limited memory/persistence between calls
- Shallow agent - fails on longer, more complex tasks

## 2. Target Architecture (DeepAgents.js)

```
┌─────────────────────────────────────────────────────────────────────┐
│                  invest_consult.ts (Target)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 Deep Agent Session                           │   │
│  │                                                              │   │
│  │  ┌─────────────────┐    ┌──────────────────┐               │   │
│  │  │  System Prompt  │    │  Message History │               │   │
│  │  └────────┬────────┘    └────────┬─────────┘               │   │
│  │           │                      │                          │   │
│  │           └──────────────────────┼──────────────────────────┘   │
│  │                                  ▼                              │
│  │                   ┌──────────────────┐                         │
│  │                   │  createDeepAgent │                         │
│  │                   │   (DeepAgents)   │                         │
│  │                   └────────┬─────────┘                         │
│  │                            │                                    │
│  │                            ▼                                    │
│  │   ┌──────────────────────────────────────────────────────┐     │
│  │   │         Four Key Components                          │     │
│  │   │                                                      │     │
│  │   │  ┌─────────────┐  ┌─────────────────┐                │     │
│  │   │  │   Planning  │  │   Sub-Agents    │                │     │
│  │   │  │     Tool    │  │  Architecture   │                │     │
│  │   │  └─────────────┘  └─────────────────┘                │     │
│  │   │                                                      │     │
│  │   │  ┌─────────────┐  ┌─────────────────┐                │     │
│  │   │  │   detailed  │  │   File System   │                │     │
│  │   │  │   Prompts   │  │     Access      │                │     │
│  │   │  └─────────────┘  └─────────────────┘                │     │
│  │   └──────────────────────────────────────────────────────┘     │
│  │                            │                                    │
│  │                            ▼                                    │
│  │   ┌──────────────────────────────────────────────────────┐     │
│  │   │    Existing LangChain Tools (Direct Reuse)           │     │
│  │   │  ┌────────────────────────────────────────────────┐  │     │
│  │   │  │  stockSearchNewsTool                           │  │     │
│  │   │  │  stockGetPriceTool                             │  │     │
│  │   │  │  stockRecallMarketInfoTool                     │  │     │
│  │   │  │  stockRecallCompanyInfoTool                    │  │     │
│  │   │  │  noteQueryTool                                 │  │     │
│  │   │  │  TravilySearchTool                             │  │     │
│  │   │  └────────────────────────────────────────────────┘  │     │
│  │   └──────────────────────────────────────────────────────┘     │
│  │                            │                                    │
│  │                            ▼                                    │
│  │                   ┌──────────────────┐                         │
│  │                   │ agent.invoke()   │                         │
│  │                   │ with streaming   │                         │
│  │                   └────────┬─────────┘                         │
│  └────────────────────────┼──────────────────────────────────────┘
│                            │
│                            ▼
│                   ┌──────────────────┐
│                   │ LangGraph Powered│
│                   │    Processing    │
│                   └────────┬─────────┘
│                            │
│                            ▼
│                   ┌──────────────────┐
│                   │  Stream Adapter  │
│                   │  (OpenAI format) │
│                   └────────┬─────────┘
│                            │
│                            ▼
│                   ┌──────────────────┐
│                   │  send() to SSE   │
│                   └──────────────────┘
│
└─────────────────────────────────────────────────────────────────────┘
```

**Benefits of DeepAgents.js:**
- Task Planning & Decomposition - Break complex tasks into manageable steps
- Sub-Agent Architecture - Delegate specialized work to focused agents
- File System Integration - Persistent memory and state management
- Streaming Support - Real-time updates and progress tracking
- Built on LangGraph - Robust framework foundation
- TypeScript First - Full type safety
- **Direct LangChain Tool Compatibility** - Reuse existing tools without adaptation

## 3. Migration Strategy

### Phase 1: Installation & Dependencies
Add DeepAgents.js to the project.

```bash
npm install deepagents
```

### Phase 2: Create Unified Investment Advisor Agent
Create a single file that contains everything: DeepAgent config, context builder, and chat method.

```typescript
// src/server/core/deepagents/investmentAdvisorAgent.ts
import { createDeepAgent } from "deepagents";
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  stockSearchNewsTool,
  stockGetPriceTool,
  stockRecallMarketInfoTool,
  stockRecallCompanyInfoTool,
  noteQueryTool,
  TravilySearchTool,
} from '../../tools';
import portfolioAnalysisService from '@/server/service/portfolioAnalysisService';
import get from 'lodash/get';
import { uuid } from '@renderer/lib/utils/uuid';

// System prompt
const SYSTEM_PROMPT = `...`;

// Create DeepAgent instance
const investmentDeepAgent = createDeepAgent({
  tools: [
    stockSearchNewsTool,
    stockGetPriceTool,
    stockRecallMarketInfoTool,
    stockRecallCompanyInfoTool,
    noteQueryTool,
    TravilySearchTool,
  ],
  systemPrompt: SYSTEM_PROMPT,
});

// Helper: Build context prompt
function buildContextPrompt(portfolioAnalysis: any, riskAnalysis: any, userQuery: string): string {
  return `...`;
}

// Export unified agent
export const investmentAdvisorAgent = {
  async chat(userQuery: string, accountId: string, send: (data: any) => void) {
    // Get portfolio, build context, stream with DeepAgents...
  },
};
```

### Phase 3: Update chatService.ts
Simply call the agent.

```typescript
// src/server/service/chatService.ts
import { investmentAdvisorAgent } from '@/server/core/deepagents/investmentAdvisorAgent';

private async handleInvestmentAdvisorChat(
  request: ChatRequest,
  emitter: SSEEmitter,
  accountId: string,
): Promise<void> {
  await investmentAdvisorAgent.chat(request.query, accountId, emitter.send.bind(emitter));
}
```

### Phase 4: Delete InvestmentAdvisorGraph
After testing is complete, delete the old graph implementation:

```bash
rm -rf src/server/core/graph/investmentAdvisorGraph
```

## 4. Error Handling Strategy

DeepAgents.js handles most errors internally (tool failures, planning issues). Integration-level error handling matches the existing pattern:

```typescript
// Simple try-catch block for stream errors
try {
  for await (const chunk of investmentDeepAgent.stream({ messages })) {
    // Process and send chunks...
  }
} catch (error) {
  logger.error('[invest_consult_deep] Stream error:', error);
  send({
    id: uuid(),
    choices: [{
      index: 0,
      finish_reason: 'error',
      delta: { role: 'assistant', content: '抱歉，生成过程中出现问题。请稍后再试。' },
    }],
  });
}
```

## 6. Simplifying chatService.ts - Remove InvestmentAdvisorGraph

### Current Architecture (Over-engineered)

```typescript
// Current flow in chatService.ts
private async handleInvestmentAdvisorChat(...) {
  // 1. Create InvestmentAdvisorGraph instance
  const investmentAdvisorGraph = new InvestmentAdvisorGraph({...});

  // 2. Setup graph (single node)
  const graph = investmentAdvisorGraph.setupInvestmentAdvisorGraph();

  // 3. Create personalized initial state
  const initialState = await investmentAdvisorGraph.createPersonalizedInitialState(...);

  // 4. Invoke graph -> calls invest_consult node -> calls createAgent
  await graph.invoke(initialState);
}

// InvestmentAdvisorGraph is just a wrapper:
// - Creates LangGraph StateGraph with ONE node
// - Builds personalized state (portfolio, risk, etc.)
// - Delegates to invest_consult node
```

**Problem**: StateGraph with only one node is over-engineering. The graph adds complexity without value.

### Target Architecture (Direct DeepAgent Call)

```typescript
// chatService.ts - Clean and minimal
import { investmentAdvisorAgent } from '@/server/core/deepagents/investmentAdvisorAgent';

private async handleInvestmentAdvisorChat(
  request: ChatRequest,
  emitter: SSEEmitter,
  accountId: string,
): Promise<void> {
  await investmentAdvisorAgent.chat(request.query, accountId, emitter.send.bind(emitter));
}
```

### Implementation - Investment Advisor Agent (Unified)

```typescript
// src/server/core/deepagents/investmentAdvisorAgent.ts (NEW)
import { createDeepAgent } from "deepagents";
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  stockSearchNewsTool,
  stockGetPriceTool,
  stockRecallMarketInfoTool,
  stockRecallCompanyInfoTool,
  noteQueryTool,
  TravilySearchTool,
} from '../../tools';
import portfolioAnalysisService from '@/server/service/portfolioAnalysisService';
import get from 'lodash/get';
import { uuid } from '@renderer/lib/utils/uuid';

// System prompt
const SYSTEM_PROMPT = `你是一个投资咨询助手，用户会给你一定的信息，包含用户的持仓情况、资产的价格以及相关的投资笔记，请支持以下意图的专业咨询：
### 咨询范围
1. portfolio_analysis: 投资组合分析
2. stock_research: 个股研究
3. market_news: 市场新闻
4. risk_assessment: 风险评估
5. transaction_history: 交易记录
6. asset_allocation: 资产配置
7. general_inquiry: 一般咨询

### 工具调用规则
+ 请调用合适的工具，并对工具的结果进行总结处理
+ 优先查询本地知识库，再查询网络信息
+ 不要自己伪造不存在的工具使用
+ 一次回答工具调用不超过10个
+ TavilySearchTool 的调用次数不能超过3次
`;

// Create DeepAgent instance
const investmentDeepAgent = createDeepAgent({
  tools: [
    stockSearchNewsTool,
    stockGetPriceTool,
    stockRecallMarketInfoTool,
    stockRecallCompanyInfoTool,
    noteQueryTool,
    TravilySearchTool,
  ],
  systemPrompt: SYSTEM_PROMPT,
});

// Helper: Build context prompt from portfolio data
function buildContextPrompt(portfolioAnalysis: any, riskAnalysis: any, userQuery: string): string {
  return `
## 用户问题
${userQuery}

## 完整资产概况
### 💰 现金资产
- 现金余额: ${portfolioAnalysis.cashAsset.amount?.toFixed(2) || 0} ${portfolioAnalysis.cashAsset?.currency || 'USD'}
- 可用资金: ${portfolioAnalysis.cashAsset?.available?.toFixed(2) || 0} ${portfolioAnalysis.cashAsset?.currency || 'USD'}

### 📈 股票资产
- 持仓数量: ${portfolioAnalysis.holdingsSummary?.length || 0}只股票
- 总市值: ${portfolioAnalysis.portfolioMetrics?.totalMarketValue?.toFixed(2) || 0}
- 总成本: ${portfolioAnalysis.assetBreakdown?.stocks?.totalCost?.toFixed(2) || 0}
- 未实现盈亏: ${portfolioAnalysis.assetBreakdown?.stocks?.unrealizedPnL?.toFixed(2) || 0}
- 盈亏比例: ${(((portfolioAnalysis.assetBreakdown?.stocks?.unrealizedPnL || 0) / (portfolioAnalysis.assetBreakdown?.stocks?.totalCost || 1)) * 100).toFixed(2)}%

- 股票明细：
${portfolioAnalysis.holdingsSummary.map(
  (stock) => `
+ 股票代码:${stock.symbol}、中文名称:${stock.chineseName}、数量:${stock.quantity}、最新价格:${stock.currentPrice}美元、持仓成本:${stock.averageCost}美元、投资笔记:${stock.investmentMemo || '无'}`,
).join('\n')}

## ⚖️ 风险评估
- 风险等级: ${riskAnalysis.level || '未评估'}
- 风险评分: ${riskAnalysis.score || 0}/100
- 建议: ${riskAnalysis.recommendations?.join(', ') || '暂无'}

---
请根据以上信息回答用户的问题: ${userQuery}
`;
}

// Export unified agent with chat method
export const investmentAdvisorAgent = {
  /**
   * Handle investment advisor chat using DeepAgents
   */
  async chat(
    userQuery: string,
    accountId: string,
    send: (data: any) => void,
  ): Promise<void> {
    // 1. Get user's portfolio context
    const portfolioAnalysis = await portfolioAnalysisService.getPortfolioAnalysis(accountId);
    const riskAnalysis = portfolioAnalysisService.calculateRiskScore(
      portfolioAnalysis.portfolioMetrics,
    );

    // 2. Build context prompt
    const contextPrompt = buildContextPrompt(portfolioAnalysis, riskAnalysis, userQuery);

    // 3. Create messages
    const messages: BaseMessage[] = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(contextPrompt),
    ];

    // 4. Stream using DeepAgents
    let id: string | undefined;

    try {
      for await (const chunk of investmentDeepAgent.stream({ messages })) {
        const [token] = chunk;
        id = token.id;
        const delta = get(token, 'contentBlocks[0].text', '');

        if (token.type === 'tool') {
          send({
            id: token.id || uuid(),
            choices: [{
              index: 0,
              finish_reason: 'tool_calls',
              delta: {
                role: 'assistant',
                tool_calls: [{
                  id: token.id,
                  index: token.index,
                  function: { name: token.name, arguments: token.arguments },
                  type: 'function',
                }],
              },
            }],
          });
        } else if (delta) {
          send({
            id: token.id || uuid(),
            choices: [{
              index: 0,
              finish_reason: null,
              delta: { role: 'assistant', content: delta },
            }],
          });
        }
      }

      // Send final stop message
      send({
        id: id || uuid(),
        choices: [{
          index: 0,
          finish_reason: 'stop',
          delta: { role: 'assistant', content: '' },
        }],
      });
    } catch (error) {
      send({
        id: uuid(),
        choices: [{
          index: 0,
          finish_reason: 'error',
          delta: {
            role: 'assistant',
            content: '抱歉，生成过程中出现问题。请稍后再试。',
          },
        }],
      });
    }
  },
};
```

### Files to Delete

```
src/server/core/graph/investmentAdvisorGraph/
├── index.ts                      # DELETE
├── investmentChatState.ts        # DELETE
```

### Updated File Structure

```
src/server/
├── service/
│   ├── chatService.ts                        # UPDATE - Simplified (3 lines)
│   └── portfolioAnalysisService.ts          # EXISTING - Reused
├── core/
│   ├── deepagents/
│   │   └── investmentAdvisorAgent.ts         # NEW - All logic in one file
│   └── graph/
│       └── investmentAdvisorGraph/           # DELETE - Entire folder
└── tools/                                    # EXISTING - Unchanged
```

### Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Graph | InvestmentAdvisorGraph (StateGraph, 1 node) | None |
| State | InvestmentChatStateAnnotation | Handled by DeepAgents internally |
| Flow | chatService → InvestmentAdvisorGraph → invest_consult → createAgent | chatService → investmentAdvisorAgent |
| chatService | ~30 lines of complex graph logic | 1 method call |
| Implementation | 4+ files (Graph, State, Service, Agent, Builder) | 1 unified file |


## 8. Dependencies

### New Dependencies
```json
{
  "deepagents": "^0.x.x"
}
```

### Existing Dependencies (Already Present)
- `langchain`: `^0.3.x` - Required for tool creation
- `@langchain/openai`: ^0.x.x
- `@langchain/tavily`: ^0.x.x (for web search)
- `zod`: Schema validation


## 11. File Structure Changes

**Added:**
```
src/server/core/deepagents/
└── investmentAdvisorAgent.ts    # NEW - All in one: Agent, chat method, context builder
```

**Deleted:**
```
src/server/core/graph/investmentAdvisorGraph/
├── index.ts                         # DELETE
├── investmentChatState.ts           # DELETE
```

**Updated:**
```
src/server/service/chatService.ts   # UPDATE - 1 method call
```

## 12. Migration Benefits Summary

### Before (Basic LangChain Agent)
- Shallow loop: LLM calls tools in a simple loop
- No planning or task decomposition
- Limited to simple, single-turn queries
- Falls apart on complex multi-step tasks

### After (DeepAgents.js)
- Smart planning: Decomposes complex tasks
- Sub-agent capability: Delegates to specialized agents
- Persistent memory: File system integration
- Better consistency: LangGraph-powered state management
- Handles complex queries reliably
- Streaming support for real-time progress
- **Zero tool adaptation needed** - Direct reuses existing LangChain tools
