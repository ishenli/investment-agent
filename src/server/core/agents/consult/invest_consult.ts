import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, SystemMessage, AIMessage, createAgent } from 'langchain';
import type { Logger } from '@server/base/logger';
import { InvestmentChatStateAnnotation } from '../../graph/investmentAdvisorGraph/investmentChatState';
import transactionService from '@server/service/transactionService';
import { AuthService } from '@server/service/authService';
import get from 'lodash/get';
import { ChatCompletionChunk } from '@typings/openai/chat';
import { noteQueryTool, stockGetPriceTool, stockRecallCompanyInfoTool, stockRecallMarketInfoTool, stockSearchNewsTool, TravilySearchTool } from '../../tools';
import { recordPrompt } from '@/server/utils/file';

// 用户意图分类工具
const SYSTEM_PROMPT = `你是一个投资咨询助手，用户会给你一定的信息，包含用户的持仓情况、资产的价格以及相关的投资笔记，请支持以下意图的专业咨询：
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

### 工具列表
+ 询问个人的投资笔记，优先使用 noteQueryTool 工具
+ 询问价格情况，优先使用 stockGetPriceTool 工具
+ 询问本地知识库的公司信息，优先使用 stockRecallCompanyInfoTool 工具
+ 询问本地知识库的市场信息，优先使用 stockRecallMarketInfoTool 工具
+ 询问网络上的信息，优先使用 TravilySearchTool 工具，TravilySearchTool的调用次数不能超过3次
`;
// 创建聊天代理节点
export function create_invest_consult(
  llm: ChatOpenAI,
  logger: Logger,
  send: (data: ChatCompletionChunk) => void,
) {
  return async (state: typeof InvestmentChatStateAnnotation.State) => {
    logger.info('[chatAgent]', {
      userQuery: state.userQuery,
      turnCount: state.turnCount,
    });

    const accountId = (await AuthService.getCurrentUserId());
    const transactionHistory = await transactionService.getTransactionHistory(accountId);
    // 构建上下文信息
    const contextInfo = `
## 用户问题
${state.userQuery}

## 完整资产概况
### 💰 现金资产
- 现金余额: ${state.context?.cashAsset?.amount?.toFixed(2) || 0} ${state.context?.cashAsset?.currency || 'USD'}
- 可用资金: ${state.context?.cashAsset?.available?.toFixed(2) || 0} ${state.context?.cashAsset?.currency || 'USD'}

### 📈 股票资产
- 持仓数量: ${state.context?.holdingsSummary?.length || 0}只股票
- 总市值: ${state.context?.portfolioMetrics?.totalMarketValue?.toFixed(2) || 0}
- 总成本: ${state.context?.assetBreakdown?.stocks?.totalCost?.toFixed(2) || 0}
- 未实现盈亏: ${state.context?.assetBreakdown?.stocks?.unrealizedPnL?.toFixed(2) || 0}
- 盈亏比例: ${(((state.context?.assetBreakdown?.stocks?.unrealizedPnL || 0) / (state.context?.assetBreakdown?.stocks?.totalCost || 1)) * 100).toFixed(2)}%
- 股票明细：${state.context.holdingsSummary.map(
      (stock) => `
+ 股票代码:${stock.symbol}、中文名称:${stock.chineseName}、数量:${stock.quantity}、最新价格:${stock.currentPrice}美元、持仓成本:${stock.averageCost}美元、投资笔记:${stock.investmentMemo || '无'}`,
    )}

## 交易记录
${transactionHistory?.transactions
  ?.map((transaction) => {
    return `+ 交易资产:${transaction.symbol}、${transaction.createdAt}、描述:${transaction.description || '无'}、交易金额: $${transaction.amount.toFixed(2)}、类型: ${transaction.type}`;})
  .join('\n')}

## ⚖️ 风险评估
- 风险等级: ${state.riskAssessment?.riskLevel || '未评估'}
- 风险评分: ${state.riskAssessment?.riskScore || 0}/100
- 建议: ${state.riskAssessment?.recommendations?.join(', ') || '暂无'}

## 📈 市场分析
${state.marketAnalysis || '暂无市场分析数据'}`;

    recordPrompt(contextInfo, 'invest-consult-agent-prompt.md');

    // 构建消息历史
    const chatMessages: BaseMessage[] = [
      new SystemMessage(SYSTEM_PROMPT),
      ...(state.chatHistory || []),
      new HumanMessage(`${contextInfo}\n\n请根据以上信息回答用户的问题: ${state.userQuery}`),
    ];

    let response = '';
    try {
      // 调用LLM生成响应
      const agent = createAgent({
        model: llm,
        tools: [stockSearchNewsTool, stockGetPriceTool, stockRecallMarketInfoTool, stockRecallCompanyInfoTool, noteQueryTool, TravilySearchTool],
      });
      // const result = await llm.stream(chatMessages);

      // for await (const chunk of result) {
      //   response += chunk.content;
      // }
      const result = await agent.stream(
        { messages: chatMessages },
        {
          streamMode: 'messages',
          recursionLimit: 100,
        },
      );
      // const resultUIStream = toUIMessageStream(result);

      // for await (const chunk of resultUIStream) {
      //   console.log(chunk);
      // }
      // for await (const chunk of result) {
      //   const [step, content] = Object.entries(chunk)[0];
      //   const delta = get(content, 'messages[0].content', '') as string;
      //   console.log(delta)
      //   send({ type: 'text-delta', delta: delta, id: '1' });
      //   response += delta || '';
      // }
      let id;
      for await (const chunk of result) {
        const [token, metadata] = chunk;
        id = token.id;
        let delta = get(token, 'contentBlocks[0].text', '') as string;
        if (token.type === 'tool') {
          send({
            id: token.id,
            choices: [
              {
                index: 0,
                finish_reason: 'tool_calls',
                delta: {
                  role: 'assistant',
                  tool_calls: [
                    {
                      id: token.id,
                      index: token.index,
                      function: {
                        name: token.name,
                        arguments: token.arguments,
                      },
                      type: 'function',
                    },
                  ],
                },
              },
            ],
          });
          send({
            id: token.id,
            choices: [
              {
                index: 0,
                finish_reason: null,
                delta: {
                  role: 'assistant',
                  content: '\n',
                },
              },
            ],
          });
        } else {
          send({
            id: token.id,
            choices: [
              {
                index: 0,
                finish_reason: null,
                delta: {
                  role: 'assistant',
                  content: delta,
                },
              },
            ],
          });
        }
        response += delta || '';
      }

      send({
        id,
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            delta: {
              role: 'assistant',
              content: '',
            },
          },
        ],
      });
      logger.info('[investConsult] Chat agent response generated');
    } catch (error) {
      logger.error('[investConsult] Error in chat agent node', { error });
      response = '抱歉，我在处理您的问题时遇到了问题。请稍后再试。';
    }

    // 更新聊天历史
    const updatedChatHistory = [
      ...(state.chatHistory || []),
      new HumanMessage(state.userQuery),
      new AIMessage(response),
    ];

    // 返回更新后的状态
    return {
      chatHistory: updatedChatHistory,
      turnCount: (state.turnCount || 0) + 1,
      marketAnalysis: response, // 也将响应存储在marketAnalysis中以保持兼容性
    };
  };
}
