import { StateCreator } from 'zustand';
import { StockStore } from '../../store';
import { connectAgentStream } from '@/app/lib/agentStreamClient';
import type { AgentStreamEvent } from '@/types/agentStream';
import { StockAnalyst } from '@/types';
import { produce } from 'immer';
import { StateAnnotation } from '@server/core/agents/langchain/graphs/tradeDecision/agentState';
import { ChatMessage } from '@lobehub/ui/chat';
import type { AgentStatusEntry } from './initialState';

export interface StockChatAction {
  generateImageFromPrompts: (items: string[], messageId: string) => Promise<void>;
  analyzeStock: (params: {
    stockSymbol: string;
    analysisDate: string;
    analysts: string[];
    researchDepth: number;
    llmProvider: string;
    llmModel: string;
    marketType: string;
  }) => Promise<void>;
}

function eventToMessage(event: Record<string, object>): ChatMessage | null {
  const key = Object.keys(event)[0] as StockAnalyst;
  const value = event[key] as typeof StateAnnotation.State;
  if (key === 'Market_Analyst') {
    return {
      id: Date.now().toString(),
      content: value.market_report as string,
      role: 'assistant',
      extra: {},
      meta: {
        title: '市场分析师',
        avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
      },
      updateAt: Date.now(),
      createAt: Date.now(),
    };
  }
  if (key === 'Bull_Researcher') {
    return {
      id: Date.now().toString(),
      content: value.investment_debate_state.current_response as string,
      role: 'assistant',
      extra: {},
      meta: {
        title: '看涨分析师',
        avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
      },
      updateAt: Date.now(),
      createAt: Date.now(),
    };
  }

  if (key === 'Bear_Researcher') {
    return {
      id: Date.now().toString(),
      content: value.investment_debate_state.current_response as string,
      role: 'assistant',
      extra: {},
      meta: {
        title: '看跌分析师',
        avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
      },
      updateAt: Date.now(),
      createAt: Date.now(),
    };
  }

  if (key === 'Research_Manager') {
    return {
      id: Date.now().toString(),
      content: value.investment_plan as string,
      role: 'assistant',
      extra: {},
      meta: {
        title: '研究经理',
        avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
      },
      updateAt: Date.now(),
      createAt: Date.now(),
    };
  }

  if (key === 'Trader') {
    return {
      id: Date.now().toString(),
      content: value.trader_investment_plan as string,
      role: 'assistant',
      extra: {},
      meta: {
        title: '交易员',
        avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
      },
      updateAt: Date.now(),
      createAt: Date.now(),
    };
  }

  if (key === 'Risky_Analyst') {
    return {
      id: Date.now().toString(),
      content: value.risk_debate_state.current_risky_response as string,
      role: 'assistant',
      extra: {},
      meta: {
        title: '激进风险分析师',
        avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
      },
      updateAt: Date.now(),
      createAt: Date.now(),
    };
  }

  if (key === 'Safe_Analyst') {
    return {
      id: Date.now().toString(),
      content: value.risk_debate_state.current_safe_response as string,
      role: 'assistant',
      extra: {},
      meta: {
        title: '保守风险分析师',
        avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
      },
      updateAt: Date.now(),
      createAt: Date.now(),
    };
  }

  if (key === 'Neutral_Analyst') {
    return {
      id: Date.now().toString(),
      content: value.risk_debate_state.current_neutral_response as string,
      role: 'assistant',
      extra: {},
      meta: {
        title: '中性风险分析师',
        avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
      },
      updateAt: Date.now(),
      createAt: Date.now(),
    };
  }

  if (key === 'Risk_Judge') {
    return {
      id: Date.now().toString(),
      content: value.final_trade_decision as string,
      role: 'assistant',
      extra: {},
      meta: {
        title: '风险判断师',
        avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
      },
      updateAt: Date.now(),
      createAt: Date.now(),
    };
  }

  if (key === 'Trade_Decision_Maker') {
    return {
      id: Date.now().toString(),
      content: JSON.stringify(value) as string,
      role: 'assistant',
      extra: {},
      meta: {
        title: '交易决策员',
        avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
      },
      updateAt: Date.now(),
      createAt: Date.now(),
    };
  }

  return null;
}

export const createStockChatSlice: StateCreator<
  StockStore,
  [['zustand/devtools', never]],
  [],
  StockChatAction
> = (set, get) => ({
  generateImageFromPrompts: async (items, messageId) => {},
  analyzeStock: async (body) => {
    const abortController = new AbortController();
    set({ requestAbortController: abortController, loading: true, statusLog: [], messages: [] });

    await connectAgentStream({
      api: '/api/stock',
      body,
      method: 'POST',
      signal: abortController.signal,
      onEvent: (event: AgentStreamEvent) => {
        switch (event.type) {
          case 'status': {
            // 将 Agent 进度写入 statusLog
            const entry: AgentStatusEntry = {
              message: event.message,
              step: event.step,
              progress: event.progress,
              timestamp: Date.now(),
            };
            set(
              produce((draft) => {
                draft.statusLog.push(entry);
              }),
            );
            break;
          }

          case 'result': {
            // 最终決策结果卡片
            const content = event.content as { decision?: unknown; state?: unknown };
            const decisionMessage: ChatMessage = {
              id: event.id || Date.now().toString(),
              content:
                typeof content.decision === 'string'
                  ? content.decision
                  : JSON.stringify(content.decision ?? content, null, 2),
              role: 'assistant',
              extra: {},
              meta: {
                title: '交易决策',
                avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
              },
              updateAt: Date.now(),
              createAt: Date.now(),
            };
            set(
              produce((draft) => {
                draft.messages.push(decisionMessage);
              }),
            );
            break;
          }

          case 'error': {
            console.error('[StockStore] Agent 流错误:', event.message, event.details);
            set({ loading: false });
            break;
          }

          case 'done': {
            set({ loading: false });
            break;
          }

          default: {
            // 将未知事件当作旧格式的原始状态对象处理（后向兼容）
            const rawEvent = event as Record<string, unknown>;
            const message = eventToMessage(rawEvent as Record<string, object>);
            if (message) {
              set(
                produce((draft) => {
                  draft.messages.push(message);
                }),
              );
            }
            break;
          }
        }
      },
      onError: (error) => {
        console.error('[StockStore] SSE 连接错误:', error);
        set({ loading: false });
      },
      onDone: () => {
        set({ loading: false });
      },
    });
  },
});
