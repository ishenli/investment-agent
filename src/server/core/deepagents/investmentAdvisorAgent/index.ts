import { createDeepAgent } from 'deepagents';
import { HumanMessage } from 'langchain';
import {
  stockSearchNewsTool,
  stockGetPriceTool,
  stockRecallMarketInfoTool,
  stockRecallCompanyInfoTool,
  noteQueryTool,
  TravilySearchTool,
} from '../../tools';
import portfolioAnalysisService from '@server/service/portfolioAnalysisService';
import transactionService from '@server/service/transactionService';
import { uuid } from '@renderer/lib/utils/uuid';
import { recordPrompt } from '@/server/utils/file';
import logger from '@/server/base/logger';
import { chatModelOpenAI } from '../../provider/chatModel';
import { extractAssistantChunkText, extractChunkId, extractAssistantReasoningText, splitThinkTagContent } from '@/server/utils/stream';
import {
  getMessageRole,
  getMessageId,
  getMessageContent,
  getToolCalls,
  appendLog,
  getToolMessageMeta,
} from '../util';
import { SSEEmitter } from '@/server/base/sseEmitter';
import { SYSTEM_PROMPT } from './agent';



/**
 * Helper function to build the context prompt from portfolio data
 * @param portfolioAnalysis - Portfolio analysis data
 * @param riskAnalysis - Risk assessment data
 * @param userQuery - Original user query
 * @returns Formatted context string
 */
function buildContextPrompt(
  portfolioAnalysis: any,
  riskAnalysis: any,
  userQuery: string,
  transactionHistory: any,
): string {
  return `
## 用户问题
${userQuery}

## 完整资产概况
### 💰 现金资产
- 现金余额: ${portfolioAnalysis.cashAsset?.amount?.toFixed(2) || 0} ${portfolioAnalysis.cashAsset?.currency || 'USD'}
- 可用资金: ${portfolioAnalysis.cashAsset?.available?.toFixed(2) || 0} ${portfolioAnalysis.cashAsset?.currency || 'USD'}

### 📈 股票资产
- 持仓数量: ${portfolioAnalysis.holdingsSummary?.length || 0}只股票
- 总市值: ${portfolioAnalysis.portfolioMetrics?.totalMarketValue?.toFixed(2) || 0}
- 总成本: ${portfolioAnalysis.assetBreakdown?.stocks?.totalCost?.toFixed(2) || 0}
- 未实现盈亏: ${portfolioAnalysis.assetBreakdown?.stocks?.unrealizedPnL?.toFixed(2) || 0}
- 盈亏比例: ${(((portfolioAnalysis.assetBreakdown?.stocks?.unrealizedPnL || 0) / (portfolioAnalysis.assetBreakdown?.stocks?.totalCost || 1)) * 100).toFixed(2)}%

- 股票明细：
${
  portfolioAnalysis.holdingsSummary
    ?.map(
      (stock: any) => `
+ 股票代码:${stock.symbol}、中文名称:${stock.chineseName}、数量:${stock.quantity}、最新价格:${stock.currentPrice}美元、持仓成本:${stock.averageCost}美元、投资笔记:${stock.investmentMemo || '无'}`,
    )
    ?.join('\n') || '无'
}

## 交易记录
${
  transactionHistory?.transactions
    ?.map((transaction: any) => {
      return `+ 交易资产:${transaction.symbol}、${transaction.createdAt}、描述:${transaction.description || '无'}、交易金额: $${transaction.amount.toFixed(2)}、类型: ${transaction.type}`;
    })
    .join('\n') || '无'
}

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
   * @param userQuery - User's question
   * @param accountId - User account ID
   * @param send - SSE send function for streaming responses
   * @param model - Chat model to use
   */
  async chat({ userQuery, accountId, emitter, model }: { userQuery: string; accountId: string; emitter: SSEEmitter; model: string }): Promise<void> {
    // 1. Get user's portfolio context
    const portfolioAnalysis = await portfolioAnalysisService.getPortfolioAnalysis(accountId);
    const riskAnalysis = portfolioAnalysisService.calculateRiskScore(
      portfolioAnalysis.portfolioMetrics,
    );
    const transactionHistory = await transactionService.getTransactionHistory(accountId);

    // 2. Build context prompt
    const contextPrompt = buildContextPrompt(
      portfolioAnalysis,
      riskAnalysis,
      userQuery,
      transactionHistory,
    );

    // Record prompt for debugging
    recordPrompt(contextPrompt, 'deepagents-investment-prompt.md');

    try {
      // Create the DeepAgent instance with all tools
      const investmentDeepAgent = createDeepAgent({
        model: await chatModelOpenAI(model),
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
      // 处理流式请求
      const messages = [new HumanMessage(contextPrompt)];
      const response = await investmentDeepAgent.stream(
        { messages },
        {
          streamMode: ['messages', 'values'],
        },
      );

      // stream() returns an async iterable - use type assertion to work around TypeScript limitation
      let lastAssistant = '';
      const seenMessageIds = new Set<string>();
      const seenToolCallIds = new Set<string>();
      /** 跨 chunk 追踪是否处于 <think> 标签块内 */
      let inThinkBlock = false;

      for await (const chunk of response) {
        const [mode, data] = chunk as [string, unknown];

        // console.log('data===>', JSON.stringify(data))
        // console.log('data===> end', mode)

        if (mode === 'values') {
          const state = data as { messages?: unknown[] };
          if (Array.isArray(state.messages)) {
            for (const rawMsg of state.messages) {
              if (!rawMsg || typeof rawMsg !== 'object') continue;
              const msg = rawMsg as Record<string, unknown>;
              const role = getMessageRole(msg);
              // console.log('data===>role', role);
              if (role === 'human') continue;

              // console.info('msg', JSON.stringify(msg.content));
              const messageId = getMessageId(msg);
              if (messageId && seenMessageIds.has(messageId)) {
                continue;
              }

              const content = getMessageContent(msg);
              const toolCalls = getToolCalls(msg);

              if (role === 'ai') {
                if (messageId) seenMessageIds.add(messageId);
                if (content || toolCalls.length > 0) {
                  appendLog({
                    role: 'ai',
                    content,
                    messageId,
                  });
                }

                for (const tc of toolCalls) {
                  if (!tc.id || seenToolCallIds.has(tc.id)) continue;
                  seenToolCallIds.add(tc.id);
                  let argsText = '';
                  try {
                    argsText = tc.args ? JSON.stringify(tc.args) : '';
                  } catch {
                    argsText = '';
                  }
                  appendLog({
                    role: 'tool_call',
                    content: `${tc.name || 'tool'}(${argsText})`,
                    toolCallId: tc.id,
                    toolName: tc.name,
                    toolArgs: tc.args,
                  });
                }
              } else if (role === 'tool') {
                if (messageId) seenMessageIds.add(messageId);
                const meta = getToolMessageMeta(msg);
                appendLog({
                  role: 'tool',
                  content,
                  messageId,
                  toolCallId: meta.toolCallId,
                  toolName: meta.toolName,
                });
              }
            }
          }
        }

        if (mode === 'messages') {
          let chunk;
          if (Array.isArray(data)) {
            chunk = data?.[0] as any;
          }
          const type = getMessageRole(chunk);
          lastAssistant += JSON.stringify(data) + '\n\n';

          if (type === 'ai') {
            const id = extractChunkId(data);
            const rawContent = extractAssistantChunkText(data);
            const reasoningContent = extractAssistantReasoningText(data);

            if (!id) continue;

            // Case 1: 模型通过 additional_kwargs.reasoning_content 输出 thinking tokens
            if (reasoningContent) {
              emitter.sendReasoningDelta(id, reasoningContent);
            }

            if (rawContent) {
              // Case 2: 模型通过 <think>...</think> 标签嵌入 thinking（如 DeepSeek-R1）
              const { reasoning, text, inThinkBlock: nextState } = splitThinkTagContent(
                rawContent,
                inThinkBlock,
              );
              inThinkBlock = nextState;

              if (reasoning) {
                emitter.sendReasoningDelta(id, reasoning);
              }
              if (text) {
                emitter.sendTextDelta(id, text);
              }
            } else if (!reasoningContent) {
              // 两种来源均无内容，跳过
              continue;
            }
          } else if (type === 'tool') {
            const meta = getToolMessageMeta(chunk);
            emitter.sendToolUseEvent(
              meta.toolCallId as string,
              meta.toolName as string,
              meta.toolArgs || {},
            );
          }
        }
      }
      emitter.sendDone();
    } catch (error) {
      // Send error as AgentStreamEvent
      logger.error('investmentAdvisorAgent error', error);
      emitter.sendAgentError('抱歉，生成过程中出现问题。请稍后再试。');
    }
  },
};
