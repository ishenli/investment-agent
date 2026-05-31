import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/app/lib/request/index';
import type { AiInsightListResponse } from '@/types/aiInsight';

// 获取持仓数据
export const usePositionsQuery = () => {
  return useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const response = await get<{ data: { positions: any[] } }>('/api/asset/positions');
      return response.data.positions;
    },
    staleTime: 1000 * 60 * 1, // 1分钟内数据视为新鲜
    retry: 1,
  });
};

// 获取AI洞察数据
export const useAIInsightsQuery = () => {
  return useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const response = await get<{ data: AiInsightListResponse }>('/api/ai-insights', {
        params: { page: 1, pageSize: 20 },
      });
      return response.data.items;
    },
    staleTime: 1000 * 60 * 5, // 5分钟内数据视为新鲜
    retry: 1,
  });
};

// 手动生成并保存 AI 洞察
export const useGenerateAIInsightsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return post('/api/position/ai-insights', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    },
  });
};

// 获取风险数据
export const useRiskDataQuery = () => {
  return useQuery({
    queryKey: ['risk-data'],
    queryFn: async () => {
      const response = await get('/api/position/risk-insights');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5分钟内数据视为新鲜
    retry: 1,
  });
};

// 获取资产配置数据
export const usePortfolioDataQuery = () => {
  return useQuery({
    queryKey: ['allocation-data'],
    queryFn: async () => {
      const response = await get('/api/position/portfolio');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5分钟内数据视为新鲜
    retry: 1,
  });
};

export const useStrategyAdviceQuery = <T>() => {
  return useQuery<T>({
    queryKey: ['strategy-advice'],
    queryFn: async () => {
      const response = await get('/api/position/strategy-advice');
      return response.data.advice;
    },
    staleTime: 1000 * 60 * 5, // 5分钟内数据视为新鲜
    retry: 1,
  });
};

// 获取历史风险数据 - 注意：这个端点可能不存在
export const useHistoryRiskDataQuery = () => {
  return useQuery({
    queryKey: ['history-risk-data'],
    queryFn: async () => {
      // TODO: 确认实际的API路径，这个端点可能不存在
      const response = await get('/api/position/risk-history'); // 可能需要调整
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5分钟内数据视为新鲜
    retry: 1,
    enabled: false, // 暂时禁用，直到确认端点存在
  });
};

// 获取分散投资建议数据
export const useDiversificationRecommendationsQuery = <T>() => {
  return useQuery<T>({
    queryKey: ['diversification-recommendations'],
    queryFn: async () => {
      const response = await get('/api/position/risk-divers');
      return response.data.recommendations;
    },
    staleTime: 1000 * 60 * 5, // 5分钟内数据视为新鲜
    retry: 1,
  });
};
