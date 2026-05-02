import { createDeepAgent } from 'deepagents';
import { BaseMessage, HumanMessage, AIMessage } from 'langchain';
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
} from '../../utils/deepagentsUtil';
import { SSEEmitter } from '@/server/base/sseEmitter';
import { SYSTEM_PROMPT } from './agent';

/**
 * 清理消息中的 LobeChat 插件指令（<plugins>...</plugins>）
 * 这些指令与投资咨询无关，会严重浪费 token 并干扰模型注意力
 */
function stripPluginInstructions(content: string): string {
  return content
    .replace(/<plugins[\s\S]*?<\/plugins>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 过滤并清理传入的 messages 数组
 * 1. 移除 LobeChat 注入的插件指令（<plugins> 标签）
 * 2. 移除 system 消息（投资顾问有自己的 SYSTEM_PROMPT）
 * 3. 清理 AI 消息中残留的插件指令
 * 4. 截断过长的投资笔记，避免破坏数据结构
 */
function sanitizeMessages(messages: BaseMessage[]): BaseMessage[] {
  return messages
    .filter((msg) => {
      // 移除所有 system 消息（投资顾问使用自己的 SYSTEM_PROMPT，不需要外部 system 指令）
      return msg._getType() !== 'system';
    })
    .map((msg) => {
      const content = typeof msg.content === 'string' ? msg.content : '';
      const cleaned = stripPluginInstructions(content);

      if (msg._getType() === 'human') {
        return new HumanMessage(cleaned);
      } else if (msg._getType() === 'ai') {
        return new AIMessage(cleaned);
      }
      return msg;
    })
    .filter((msg) => {
      // 过滤掉清理后内容为空的消息
      const content = typeof msg.content === 'string' ? msg.content : '';
      return content.trim().length > 0;
    });
}

/**
 * 记录完整的 prompt 日志到文件，保留消息结构便于调试
 * 输出格式：System Prompt + 每条消息的角色、长度、完整内容
 */
function logPrompt(systemPrompt: string, messages: BaseMessage[]): void {
  const roleName = (type: string): string => {
    switch (type) {
      case 'human': return 'HumanMessage';
      case 'ai': return 'AIMessage';
      case 'system': return 'SystemMessage';
      default: return type;
    }
  };

  const promptLog = [
    `# System Prompt`,
    systemPrompt,
    '',
    `# Messages (${messages.length} 条)`,
    ...messages.map((m, i) => {
      const role = m._getType();
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return [
        `## [${i}] ${roleName(role)}`,
        `Length: ${content.length} chars`,
        '```',
        content,
        '```',
      ].join('\n');
    }),
  ].join('\n\n');
  recordPrompt(promptLog, 'deepagents-investment-prompt.md');
}



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
  // 获取币种符号的辅助函数
  const getCurrencySymbol = (currency?: string): string => {
    switch (currency) {
      case 'CNY': return '¥';
      case 'HKD': return 'HK$';
      default: return '$';
    }
  };
  const getCurrencyName = (currency?: string): string => {
    switch (currency) {
      case 'CNY': return '人民币';
      case 'HKD': return '港币';
      default: return '美元';
    }
  };

  return `
## 完整资产概况
### 💰 现金资产
- 现金余额: ${portfolioAnalysis.cashAsset?.amount?.toFixed(2) || 0} ${portfolioAnalysis.cashAsset?.currency || 'USD'}
- 可用资金: ${portfolioAnalysis.cashAsset?.available?.toFixed(2) || 0} ${portfolioAnalysis.cashAsset?.currency || 'USD'}

### 📈 股票资产
- 持仓数量: ${portfolioAnalysis.holdingsSummary?.length || 0}只股票
- 总市值(USD): $${portfolioAnalysis.portfolioMetrics?.totalMarketValue?.toFixed(2) || 0}
- 总成本(USD): $${portfolioAnalysis.assetBreakdown?.stocks?.totalCost?.toFixed(2) || 0}
- 未实现盈亏(USD): $${portfolioAnalysis.assetBreakdown?.stocks?.unrealizedPnL?.toFixed(2) || 0}
- 盈亏比例: ${(((portfolioAnalysis.assetBreakdown?.stocks?.unrealizedPnL || 0) / (portfolioAnalysis.assetBreakdown?.stocks?.totalCost || 1)) * 100).toFixed(2)}%

- 股票明细：
${
  portfolioAnalysis.holdingsSummary
    ?.map(
      (stock: any) => {
        const cs = getCurrencySymbol(stock.currency);
        const cn = getCurrencyName(stock.currency);
        return `+ 股票代码:${stock.symbol}、中文名称:${stock.chineseName}、数量:${stock.quantity}、最新价格:${cs}${stock.currentPrice}(${cn})、持仓成本:${cs}${stock.averageCost}(${cn})、USD市值:$${stock.marketValueUSD?.toFixed(2) || stock.marketValue?.toFixed(2)}、投资笔记:${stock.investmentMemo || '无'}`;
      },
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

/**
 * 精简版上下文构建函数，用于多轮对话
 * 不重复注入完整持仓明细，仅提供摘要 + 最新变动 + 用户问题
 */
function buildCompactContextPrompt(
  portfolioAnalysis: any,
  riskAnalysis: any,
  userQuery: string,
  transactionHistory: any,
): string {
  // 获取币种符号的辅助函数
  const getCurrencySymbol = (currency?: string): string => {
    switch (currency) {
      case 'CNY': return '¥';
      case 'HKD': return 'HK$';
      default: return '$';
    }
  };

  // 仅展示持仓代码和最新盈亏，不重复完整明细
  const holdingsBrief = portfolioAnalysis.holdingsSummary
    ?.map((stock: any) => {
      const cs = getCurrencySymbol(stock.currency);
      return `${stock.symbol}:${cs}${stock.currentPrice}(${stock.unrealizedPnL >= 0 ? '+' : ''}${stock.unrealizedPnL?.toFixed(2) || 0})`;
    })
    ?.join(', ') || '无';

  // 仅展示最近 5 条交易
  const recentTransactions = transactionHistory?.transactions
    ?.slice(-5)
    ?.map((t: any) => `${t.symbol} ${t.type} $${t.amount.toFixed(2)}`)
    ?.join(', ') || '无';

  return `## 上下文更新（多轮对话增量数据）
以下是基于最新数据的资产摘要，完整持仓详情已在之前的对话中提供：
- 总市值: $${portfolioAnalysis.portfolioMetrics?.totalMarketValue?.toFixed(2) || 0}
- 未实现盈亏: $${portfolioAnalysis.assetBreakdown?.stocks?.unrealizedPnL?.toFixed(2) || 0}
- 持仓: ${holdingsBrief}
- 风险: ${riskAnalysis.level || '未评估'}(${riskAnalysis.score || 0}/100)
- 近期交易: ${recentTransactions}

---
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
  async chat({ messages, userQuery, accountId, emitter, model }: { messages: BaseMessage[]; userQuery: string; accountId: string; emitter: SSEEmitter; model: string }): Promise<void> {
    // 0. 清理消息：过滤插件指令和 system 消息，避免无关内容浪费 token
    const cleanMessages = sanitizeMessages(messages);

    // 1. Get user's portfolio context
    const portfolioAnalysis = await portfolioAnalysisService.getPortfolioAnalysis(accountId);
    const riskAnalysis = portfolioAnalysisService.calculateRiskScore(
      portfolioAnalysis.portfolioMetrics,
    );
    const transactionHistory = await transactionService.getTransactionHistory(accountId);

    // 2. 判断是否需要注入完整资产上下文
    // 多轮对话：已有 AI 回复（即存在对话历史），使用精简版避免重复注入
    const isMultiTurn = cleanMessages.filter((msg) => msg._getType() === 'ai').length > 0;

    // 3. Build context prompt（多轮对话使用精简版）
    const contextPrompt = isMultiTurn
      ? buildCompactContextPrompt(portfolioAnalysis, riskAnalysis, userQuery, transactionHistory)
      : buildContextPrompt(portfolioAnalysis, riskAnalysis, userQuery, transactionHistory);

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
        systemPrompt: SYSTEM_PROMPT  // 始终使用投资顾问专用 system prompt，不混入外部 system 指令
      });

      // 构建最终的消息列表，确保用户的追问意图不被上下文数据淹没
      const finalMessages: BaseMessage[] = [];

      if (isMultiTurn) {
        // 多轮对话：保留历史消息 + 在最后一条用户消息前插入增量上下文
        // 先将所有历史消息原样保留（用户原始问题不被覆盖）
        for (let i = 0; i < cleanMessages.length - 1; i++) {
          finalMessages.push(cleanMessages[i]);
        }
        // 最后一条用户消息：将增量上下文 + 用户原始问题组合，用户问题置顶突出
        const originalUserMsg = typeof cleanMessages[cleanMessages.length - 1].content === 'string'
          ? cleanMessages[cleanMessages.length - 1].content as string
          : userQuery;
        finalMessages.push(new HumanMessage(contextPrompt + '\n\n用户追问: ' + originalUserMsg));
      } else {
        // 首轮对话：直接用完整上下文作为用户消息
        finalMessages.push(new HumanMessage(contextPrompt));
      }


      logPrompt(SYSTEM_PROMPT, finalMessages);

      // 处理流式请求
      const response = await investmentDeepAgent.stream(
        { messages: finalMessages },
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
