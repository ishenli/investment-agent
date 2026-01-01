import { StateCreator } from 'zustand';
import {
  PositionAsset,
  Portfolio,
  RiskInsights,
  Alert,
  Notification,
  DiversificationRecommendation,
  StrategyAdvice,
} from './types';
import { PositionState } from './initialState';
import { post, get as getHttp, put as putHttp } from '@/app/lib/request/index';

export interface PositionActions {
  setPositions: (positions: PositionAsset[]) => void;
  setPortfolio: (portfolio: Portfolio | null) => void;
  setRiskInsights: (riskInsights: RiskInsights | null) => void;
  addAlert: (alert: Alert) => void;
  resolveAlert: (alertId: string) => void;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (notificationId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDiversificationRecommendations: (recommendations: DiversificationRecommendation[]) => void;
  setStrategyAdvice: (advice: StrategyAdvice[]) => void;
  generateAIInsights: () => Promise<void>;
  fetchDiversificationRecommendations: () => Promise<void>;
  fetchStrategyAdvice: () => Promise<void>;
  generateStrategyAdvice: () => Promise<void>;
  analyzeScenario: (scenario: {
    asset: string;
    action: 'buy' | 'sell';
    quantity: number;
    price: number;
  }) => Promise<Array<{
    metric: string;
    currentValue: number;
    newValue: number;
    change: number;
  }> | void>;
  fetchAIInsights: () => Promise<void>;
  updatePosition: (data: Partial<PositionAsset>) => Promise<void>; // 新增方法
}

export const createPositionSlice: StateCreator<
  PositionState & PositionActions,
  [['zustand/devtools', never]],
  [],
  PositionActions
> = (set, get) => ({
  setPositions: (positions: PositionAsset[]) => set({ positions }),
  setPortfolio: (portfolio: Portfolio | null) => set({ portfolio }),
  setRiskInsights: (riskInsights: RiskInsights | null) => set({ riskInsights }),
  addAlert: (alert: Alert) => set((state) => ({ alerts: [...state.alerts, alert] })),
  resolveAlert: (alertId: string) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === alertId ? { ...alert, resolved: true } : alert,
      ),
    })),
  addNotification: (notification: Notification) =>
    set((state) => ({ notifications: [...state.notifications, notification] })),
  markNotificationAsRead: (notificationId: string) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    })),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  setDiversificationRecommendations: (recommendations: DiversificationRecommendation[]) =>
    set({ diversificationRecommendations: recommendations }),
  setStrategyAdvice: (advice: StrategyAdvice[]) => set({ strategyAdvice: advice }),

  fetchAIInsights: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/position/ai-insights');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // 确保时间戳被正确解析为Date对象
      const insights =
        data.data?.insights?.map((insight: any) => ({
          ...insight,
          timestamp: new Date(insight.timestamp),
        })) || [];

      set({ aiInsights: insights, loading: false });
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  generateAIInsights: async () => {
    set({ loading: true, error: null });
    try {
      const state = get();
      if (state.positions && state.portfolio) {
        const response = await post('/api/position/ai-insights', {
          positions: state.positions,
          portfolio: state.portfolio,
        });

        // 确保时间戳被正确解析为Date对象
        const insights =
          response.insights?.map((insight: any) => ({
            ...insight,
            timestamp: new Date(insight.timestamp),
          })) || [];

        set({ aiInsights: insights, loading: false });
      }
      set({ loading: false });
    } catch (error) {
      console.error('Error generating AI insights:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchDiversificationRecommendations: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/position/risk-divers');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      set({ diversificationRecommendations: data.data?.recommendations || [], loading: false });
    } catch (error) {
      console.error('Error fetching diversification recommendations:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchStrategyAdvice: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/position/strategy-advice');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      set({ strategyAdvice: data.data?.advice || [], loading: false });
    } catch (error) {
      console.error('Error fetching strategy advice:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  generateStrategyAdvice: async () => {
    set({ loading: true, error: null });
    try {
      const state = get();
      if (state.positions && state.portfolio) {
        const data = await post('/api/position/strategy-advice', {
          positions: state.positions,
          portfolio: state.portfolio,
        });
        set({ strategyAdvice: data.advice, loading: false });
        console.log('Generated strategy advice:', data.advice);
      }
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  analyzeScenario: async (scenario) => {
    set({ analyzeScenariosLoading: true, error: null });
    try {
      const state = get();
      if (state.positions && state.portfolio) {
        const response = await post('/api/position/scenario-analysis', {
          scenario,
        });

        // 在这里可以设置分析结果到状态中，如果需要的话
        console.log('Scenario analysis results:', response.data.results);
        set({ analyzeScenariosLoading: false });
        return response.data.results;
      }
      set({ analyzeScenariosLoading: false });
      return [];
    } catch (error) {
      set({ error: (error as Error).message, analyzeScenariosLoading: false });
      return [];
    }
  },

  // 新增的updatePosition方法
  updatePosition: async (data: Partial<PositionAsset>) => {
    set({ loading: true, error: null });
    try {
      // 调用API更新持仓
      const response = await putHttp(`/api/position`, data);
      if (!response.success) {
        console.error('Error updating position:', response.message);
        set({ error: response.message, loading: false });
        return;
      }
      
      // 更新本地状态
      const state = get();
      const updatedPositions = state.positions.map(position => 
        position.id === data.id ? { ...position, ...data } : position
      );
      set({ positions: updatedPositions, loading: false });
      
      return response;
    } catch (error) {
      console.error('Error updating position:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
});