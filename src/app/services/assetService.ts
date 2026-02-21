import { get, put } from '@/app/lib/request/index';
import {
  TradingAccountType,
  SnapshotRevenueMetrics,
  SnapshotRevenuePeriod,
  SnapshotRevenueHistory,
} from '@typings/account';
import { PositionType } from '@typings/position';
import { AssetSummaryType } from '@typings/asset';

// 账户相关API
export const fetchAccount = async (): Promise<TradingAccountType> => {
  const response = await get<{ data: TradingAccountType }>('/api/account/trading');
  return response.data;
};

// 持仓相关API
export const fetchPositions = async (): Promise<PositionType[]> => {
  const response = await get<{ data: { positions: PositionType[] } }>(
    '/api/asset/positions',
  );
  return response.data.positions;
};

// 交易记录相关API
export const fetchTransactions = async () => {
  const response = await get('/api/asset/transactions');
  return response.data;
};

// 收益相关API - 基于快照计算
export const fetchRevenue = async (
  period: SnapshotRevenuePeriod = '1M',
): Promise<SnapshotRevenueMetrics> => {
  const response = await get<{ data: { metrics: SnapshotRevenueMetrics } }>(
    `/api/asset/revenue?period=${period}`,
  );
  return response.data.metrics;
};

// 收益历史相关API - 基于快照计算
export const fetchRevenueHistory = async (
  period: SnapshotRevenuePeriod = '1M',
): Promise<SnapshotRevenueHistory> => {
  const response = await get<{ data: SnapshotRevenueHistory }>(
    `/api/asset/revenue/history?period=${period}`,
  );
  return response.data;
};

// 摘要相关API
export const fetchSummary = async (): Promise<AssetSummaryType> => {
  const response = await get<{ data: { summary: AssetSummaryType } }>('/api/asset/summary');
  return response.data.summary;
};

export const fetchLatestPrice = async (symbol: string, market: string) => {
  try {
    const response = await fetch('/api/asset/price', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol, market }),
    });

    if (!response.ok) {
      throw new Error('获取价格失败');
    }

    const result = await response.json();
    return result.data.data.priceCents;
  } catch (error) {
    console.error('获取最新价格时出错:', error);
    return null;
  }
};

// 更新账户余额
export const updateAccountBalance = async (newBalance: number): Promise<TradingAccountType> => {
  const response = await put<{ data: TradingAccountType }>('/api/asset/balance', {
    balance: newBalance,
  });
  return response.data;
};
