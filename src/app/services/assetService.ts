import { get, put } from '@/app/lib/request/index';
import { TradingAccountType } from '@typings/account';
import { PositionType } from '@typings/position';
import { revenueMetricType } from '@typings/account';
import { AssetSummaryType } from '@typings/asset';

// 账户相关API
export const fetchAccount = async (): Promise<TradingAccountType> => {
  const response = await get<{ data: TradingAccountType }>('/api/account/trading');
  return response.data;
};

// 持仓相关API
export const fetchPositions = async (): Promise<PositionType[]> => {
  const response = await get<{ data: { positions: PositionType[] } }>(
    '/api/asset/account/positions',
  );
  return response.data.positions;
};

// 交易记录相关API
export const fetchTransactions = async () => {
  const response = await get('/api/asset/account/transactions');
  return response.data;
};

// 收益相关API
export const fetchRevenue = async (period: string = '30d'): Promise<revenueMetricType> => {
  const response = await get<{ data: { metrics: revenueMetricType } }>(
    `/api/asset/account/revenue?period=${period}`,
  );
  return response.data.metrics;
};

// 摘要相关API
export const fetchSummary = async (): Promise<AssetSummaryType> => {
  const response = await get<{ data: { summary: AssetSummaryType } }>('/api/asset/account/summary');
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
  const response = await put<{ data: TradingAccountType }>('/api/asset/account/balance', {
    balance: newBalance,
  });
  return response.data;
};
