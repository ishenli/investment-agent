/**
 * useExchangeRates Hook
 *
 * 汇率管理 Hook：提供汇率获取、更新和货币转换功能
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ExchangeRateData {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: 'manual' | 'api' | 'default';
  lastUpdated: string | null;
}

export interface ExchangeRatesResponse {
  rates: ExchangeRateData[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

export interface UpdateRateRequest {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}

/**
 * 获取所有汇率
 */
async function fetchExchangeRates(): Promise<ExchangeRatesResponse> {
  const response = await fetch('/api/exchange-rates');
  if (!response.ok) {
    throw new Error('获取汇率失败');
  }
  const result: ApiResponse<{ rates: ExchangeRateData[] }> = await response.json();
  return { rates: result.data?.rates || [] };
}

/**
 * 更新汇率
 */
async function updateExchangeRate(data: UpdateRateRequest): Promise<ExchangeRateData> {
  const response = await fetch('/api/exchange-rates', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('更新汇率失败');
  }
  const result: ApiResponse<ExchangeRateData> = await response.json();
  return result.data;
}

/**
 * 从在线 API 获取汇率
 */
async function fetchOnlineRates(): Promise<ExchangeRatesResponse> {
  const response = await fetch('/api/exchange-rates/fetch-online', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('从在线获取汇率失败');
  }
  const result: ApiResponse<{ rates: ExchangeRateData[] }> = await response.json();
  return { rates: result.data?.rates || [] };
}

/**
 * 重置为默认汇率
 */
async function resetToDefaults(): Promise<ExchangeRatesResponse> {
  const response = await fetch('/api/exchange-rates/reset-defaults', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('重置汇率失败');
  }
  const result: ApiResponse<{ rates: ExchangeRateData[] }> = await response.json();
  return { rates: result.data?.rates || [] };
}

/**
 * 初始化默认汇率
 */
async function initializeDefaults(): Promise<ExchangeRatesResponse> {
  const response = await fetch('/api/exchange-rates/init-defaults', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('初始化默认汇率失败');
  }
  const result: ApiResponse<{ rates: ExchangeRateData[] }> = await response.json();
  return { rates: result.data?.rates || [] };
}

/**
 * 汇率管理 Hook
 */
export function useExchangeRates() {
  const queryClient = useQueryClient();

  // 获取汇率列表
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ExchangeRatesResponse>({
    queryKey: ['exchange-rates'],
    queryFn: fetchExchangeRates,
  });

  // 更新汇率
  const updateRateMutation = useMutation({
    mutationFn: updateExchangeRate,
    onSuccess: () => {
      // 更新成功后刷新汇率列表
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
    },
  });

  // 从在线获取汇率
  const fetchOnlineMutation = useMutation({
    mutationFn: fetchOnlineRates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
    },
  });

  // 重置为默认汇率
  const resetMutation = useMutation({
    mutationFn: resetToDefaults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
    },
  });

  // 初始化默认汇率
  const initMutation = useMutation({
    mutationFn: initializeDefaults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
    },
  });

  /**
   * 获取指定货币对的汇率
   */
  const getRate = (fromCurrency: string, toCurrency: string = 'USD'): number | null => {
    const rate = data?.rates.find(
      (r) => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency
    );
    return rate?.rate ?? null;
  };

  /**
   * 货币转换（转换为 USD）
   */
  const convertToUSD = (amount: number, fromCurrency: string): number => {
    const rate = getRate(fromCurrency, 'USD');
    if (rate === null) {
      console.warn(`Exchange rate not found for ${fromCurrency} to USD, using 1:1 conversion`);
      return amount;
    }
    return amount * rate;
  };

  return {
    // 数据
    rates: data?.rates ?? [],
    isLoading,
    error,

    // 操作方法
    updateRate: updateRateMutation.mutate,
    updateRateAsync: updateRateMutation.mutateAsync,
    fetchOnline: fetchOnlineMutation.mutate,
    resetToDefaults: resetMutation.mutate,
    initializeDefaults: initMutation.mutate,
    refetch,

    // 辅助方法
    getRate,
    convertToUSD,

    // 状态
    isUpdating: updateRateMutation.isPending,
    isFetchingOnline: fetchOnlineMutation.isPending,
    isResetting: resetMutation.isPending,
  };
}
