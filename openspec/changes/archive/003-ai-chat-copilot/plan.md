# Implementation Plan: AI 决策对话功能 (基于CopilotKit+LangGraph升级)

**Feature Branch**: `003-ai-ai`  
**Plan Status**: 已适配CopilotKit+LangGraph架构

---

## Vision

> _基于现有CopilotKit+LangGraph架构，用户可在CopilotSidebar内通过自然语言获得专业投资咨询和个性化建议，实现零配置智能投顾体验。_

---

## 技术背景 (基于已集成的CopilotKit+LangGraph)

### 现有技术栈验证 ✅

- **前端**: CopilotKit React UI (`@copilotkit/react-ui`) + CopilotSidebar
  (已集成)
- **AI架构**: LangGraph工作流引擎 (路径: `src/server/tradingagents/`)
- **数据层**: 现有Finnhub→LangGraph→PostgreSQL链路已验证
- **实时通信**: `/api/copilotkit`已配置SSE

### 架构优势确认

1. **零重复开发**: 复用现有CopilotSidebar中单轮对话能力
2. **专业Agent网络**: 直接接入现有6个专业代理（分析师/研究员/评估员/交易员）
3. **状态自管理**: CopilotKit原生记忆+LangGraph会话追踪

---

## Phase 1: CopilotKit增强适配 (无需新表)

### 1.1 CopilotKit核心配置升级

```typescript
// /api/copilotkit/route.ts
export const POST = async (req: Request) => {
  return copilotRuntime(req, {
    // 直接接入LangGraph现有的交易图谱
    chat: {
      'investment-advisor': {
        customGraph:
          'src/server/graphs/chat-dialogue-reuse-existing-tradingGraph.ts',
      },
    },
    // 复用现有的Finnhub数据交换
    state: {
      'market-context': {
        apis: ['finnhub', 'price-service', 'user-holdings'],
      },
    },
  } as CopilotRequest);
};
```

### 1.2 专业投资代理调用链

```
用户提问 → CopilotSidebar → LangGraph → [待激活代理]:
                                           ├── market_analyst("实时行情解读")
                                           ├── risk_manager("风险评估")
                                           ├── bull_researcher("看多观点")
                                           └── bear_researcher("看空分析")
```

### 1.3 数据融合（零成本实现）

- ✅ 用户持仓: `AssetService`现已被LangGraph验证
- ✅ 实时行情: `FinnhubAgent`现已被tradingagents使用
- ✅ 用户信息: 现有用户会话自动携带

---

## Phase 2: 增强功能实现路径

### 2.1 核心状态模型 (基于现有模式)

```typescript
// ChatDialogueState.ts - 复用tradingagents AgentState结构
interface ChatDialogueState extends AgentState {
  userQuery: string;
  analysisStage:
    | 'initial'
    | 'market_analysis'
    | 'risk_assessment'
    | 'recommendation';
  context: {
    holdingsSummary: Position[]; // 复用Asset数据
    portfolioMetrics: RiskMetrics; // 复用risk_assessment工具
    marketSentiment: SentimentData; // 复用news_analyst输出
  };
}
```

### 2.2 CopilotKB知识集成

```typescript
// 仅需增加投资知识库注入
const investmentKnowledgeBase = {
  stocks: '手动维护的蓝筹/成长/价值股知识',
  strategies: '现有风险等级投资案例',
  education: '新手指南文档',
};

CopilotKB.insert('investment-expertise', investmentKnowledgeBase);
```

---

## Phase 3: CopilotSidebar高级功能

### 3.1 上下文感知对话

```tsx
// pages/[...]/dashboard.tsx
useCopilotReadable({
  name: 'user-investment-context',
  description: '用户实时投资状态',
  data: {
    loginUser: getUserProfile(), // 来源于现有auth
    currentHoldings: getPositions(), // 来源于AssetService
    watchList: getWatchlist(), // 来源于现有前端store
  },
});
```

### 3.2 专业指令系统实现

```tsx
// 在现有CopilotSidebar中添加专业指令
CopilotSidebar.commands = [
  {
    name: '风险测评',
    handler: '/risk-assessment',
    description: '基于持仓分析风险',
  },
  {
    name: '投资建议',
    handler: '/investment-recommendations',
    description: '根据风险偏好推荐标的',
  },
];
```

### 3.3 无需API契约（LangGraph协商）

- LangGraph的DAG状态自动持久化
- 现有`/api/copilotkit`已高精度调用
- 增量只需添加State分散器

---

## 测试验收策略

### CopilotKit集成测试

```typescript
// Chat-specific functions - 复用现有test patterns
test('投资风险测评对话', async () => {
  await copilotSidebar.type('我的持仓风险高吗？');
  expect(copilotSidebar).toInclude('基于您的持仓...');
});

test('个性化投资建议', async () => {
  await copilotSidebar.type('我是保守投资者，有什么推荐？');
  expect(response).toMatch(/低风险|稳健|分红/);
});
```

### 性能基准验证

- ✅ 现有CopilotKit < 2秒响应已验证
- ✅ LangGraph并发场景已测试
- ✅ 零额外数据存储

---

## 工作量评估 (已建成架构)

| 任务                   | 耗时      | 现状               |
| ---------------------- | --------- | ------------------ |
| CopilotSidebar指令添加 | 0.5h      | 直接修改现有配置   |
| LangGraph节点状态适配  | 1h        | 复用AgentState模式 |
| 用户上下文集成         | 0.5h      | 复用现有资产数据   |
| 测试验证               | 1h        | 复用现有测试框架   |
| **总用时**             | **3小时** | 无需重构现有能力   |

---

## 下一步立即实施步骤

1. **立即验证**:

   ```bash
   npm run dev
   # 访问 http://localhost:3000
   # 在CopilotSidebar测试:"请问我的持仓怎么样？"
   ```

2. **LangGraph配置**:

   ```typescript
   // 在现有tradingGraph.ts中追加对话节点
   config.addNode('investment_dialogue', InvestmentDialogueNode);
   config.addEdge('user_input', 'market_analysis');
   ```

3. **完成验证**: 直接在CopilotSidebar发送不同投资问题，验证零配置用户体验
