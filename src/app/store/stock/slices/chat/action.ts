import { StateCreator } from 'zustand';
import { StockStore } from '../../store';
import { requestSSE } from '@/app/lib/request/index';
import { StockAnalyst } from '@/types';
import { produce } from 'immer';
import { StateAnnotation } from '@server/core/graph/tradeDecision/agentState';
import { ChatMessage } from '@lobehub/ui/chat';

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
    set({
      requestAbortController: abortController,
      loading: true,
    });
    const isCompleted = false;
    await requestSSE({
      api: '/api/stock',
      body,
      method: 'POST',
      signal: abortController.signal,
      onBeforeProcess: () => {
        // 处理开始前的回调
        console.log('processing started');
      },
      onProcessChunk: (jsonData: string) => {
        try {
          const event = JSON.parse(jsonData);
          const message = eventToMessage(event);
          if (message) {
            set(
              produce((draft) => {
                draft.messages.push(message);
              }),
            );
          }
        } catch (e) {
          console.warn('Failed to parse SSE progress data:', jsonData, e);
        }
      },
      onAfterProcess: () => {
        set({ loading: false });
        // 处理完成后的回调
        if (!isCompleted) {
        }
      },
    });
  },
});
