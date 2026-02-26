import { MemorySaver } from "@langchain/langgraph";
import { chatModelOpenAISync } from "../../provider/chatModel";
import { noteQueryTool, stockGetPriceTool, stockRecallCompanyInfoTool, stockRecallMarketInfoTool, stockSearchNewsTool, TravilySearchTool } from "../../tools";
import { createDeepAgent } from "deepagents";

const checkpointer = new MemorySaver();

// System prompt for the investment advisor agent
export const SYSTEM_PROMPT = `你是一个投资咨询助手，用户会给你一定的信息，包含用户的持仓情况、资产的价格以及相关的投资笔记，请支持以下意图的专业咨询：
### 咨询范围
1. portfolio_analysis: 投资组合分析（如"我的持仓风险如何？"、"账户盈亏情况怎么样？"）
2. stock_research: 个股研究（如"请分析一下特斯拉股票"、"AAPL的最新情况"）
3. market_news: 市场新闻（如"最近有什么重要财经新闻？"、"市场趋势如何？"）
4. risk_assessment: 风险评估（如"我的风险等级是什么？"、"如何降低投资风险？"）
5. transaction_history: 交易记录（如"我最近的交易记录是什么？"、"查看历史交易"）
6. asset_allocation: 资产配置（如"如何优化我的资产配置？"、"股票和现金的比例是否合理？"）
7. general_inquiry: 一般咨询（如"什么是ETF？"、"如何开户？"等通用问题）

### 工具调用规则
+ 请调用合适的工具，并对工具的结果进行总结处理，可以作为推理的输入。
+ 优先查询本地知识库，再查询网络信息。
+ 不要自己伪造不存在的工具使用
+ 一次回答工具调用不超过10个
+ TavilySearchTool 的调用次数不能超过3次
`;

export const agent: Awaited<ReturnType<typeof createDeepAgent>> = createDeepAgent({
  model: chatModelOpenAISync('Kimi-K2.5'),
  checkpointer,
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