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
 * 2. 移除 system 消息（投资顾问使用自己的 SYSTEM_PROMPT）
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

// ── Obsolete helpers (removed in favor of unified EngineRunContext.portfolioContext) ──
// `buildContextPrompt` and `buildCompactContextPrompt` were previously used here
// to construct per-turn asset context inside the engine.  They are now replaced by
// `buildCompactPortfolioSummary` in the route layer, which injects a single compact
// summary into the system prompt via `extra.portfolioContext`.

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

      // 2. Build final message list — conversation history plus the current user query
      const isMultiTurn = cleanMessages.filter((msg) => msg._getType() === 'ai').length > 0;
      const finalMessages: BaseMessage[] = [];

      if (isMultiTurn) {
        // 多轮对话：保留全部历史消息，追加当前用户追问
        for (let i = 0; i < cleanMessages.length - 1; i++) {
          finalMessages.push(cleanMessages[i]);
        }
        const originalUserMsg = typeof cleanMessages[cleanMessages.length - 1].content === 'string'
          ? cleanMessages[cleanMessages.length - 1].content as string
          : userQuery;
        finalMessages.push(new HumanMessage(originalUserMsg));
      } else {
        // 首轮对话：直接用用户问题作为消息（资产上下文在 system prompt 中）
        finalMessages.push(new HumanMessage(userQuery));
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
