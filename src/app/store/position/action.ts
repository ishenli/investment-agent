import { StateCreator } from 'zustand';
import { PositionAsset, Portfolio, RiskInsights, Alert } from './types';
import { PositionState } from './initialState';
import { put as putHttp } from '@/app/lib/request/index';

export interface PositionActions {
  setPositions: (positions: PositionAsset[]) => void;
  setPortfolio: (portfolio: Portfolio | null) => void;
  setRiskInsights: (riskInsights: RiskInsights | null) => void;
  addAlert: (alert: Alert) => void;
  resolveAlert: (alertId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updatePosition: (data: Partial<PositionAsset>) => Promise<void>;
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
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),

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
      const updatedPositions = state.positions.map((position) =>
        position.id === data.id ? { ...position, ...data } : position,
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
