import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { 
  noteQueryClaudeTool, 
  TravilySearchClaudeTool,
  stockRecallMarketInfoClaudeTool,
  stockRecallCompanyInfoClaudeTool,
  stockSearchNewsClaudeTool,
  stockGetPriceClaudeTool,
  dbQueryClaudeTool,
  transactionHistoryClaudeTool,
  transactionHistoryByDateClaudeTool,
  accountBalanceClaudeTool,
  transactionSummaryClaudeTool,
  addTransactionClaudeTool,
} from '@server/core/agents/langchain/tools';

/**
 * 创建带有自定义工具的 SDK MCP 服务器
 * 用于集成项目特定的工具到 Claude Agent SDK
 */
export const igToolsServer = createSdkMcpServer({
  name: 'ig-tools',
  version: '1.0.0',
  tools: [
    // Note 查询工具
    noteQueryClaudeTool,

    // Tavily 搜索工具
    TravilySearchClaudeTool,

    // 市场信息查询工具
    stockRecallMarketInfoClaudeTool,

    // 公司信息查询工具
    stockRecallCompanyInfoClaudeTool,

    // 股票新闻查询工具
    stockSearchNewsClaudeTool,

    // 股票价格查询工具
    stockGetPriceClaudeTool,

    // db 查询工具
    dbQueryClaudeTool,

    // 交易历史查询工具
    transactionHistoryClaudeTool,

    // 按日期查询交易历史工具
    transactionHistoryByDateClaudeTool,

    // 账户余额查询工具
    accountBalanceClaudeTool,

    // 交易摘要查询工具
    transactionSummaryClaudeTool,

    // 添加交易记录工具
    addTransactionClaudeTool,

  ],
});
