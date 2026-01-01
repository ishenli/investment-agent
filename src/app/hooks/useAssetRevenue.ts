'use client';

import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { revenueMetricType } from '@typings/account';
import { fetchRevenue } from '@renderer/services/assetService';

// 定义查询键的枚举，便于维护
export enum AssetRevenueQueryKey {
  Base = 'assetRevenue',
}

// 定义查询参数类型
interface UseAssetRevenueParams {
  accountId: string;
  period?: string;
}

// 定义返回的数据类型
interface AssetRevenueData {
  data: {
    metrics: revenueMetricType;
  };
}

/**
 * 获取资产收益数据的自定义钩子
 * @param params 查询参数
 * @returns 查询结果
 */
export const useAssetRevenue = (
  params: UseAssetRevenueParams,
): UseQueryResult<AssetRevenueData, Error> => {
  const { accountId, period = '30d' } = params;

  return useQuery<AssetRevenueData, Error>({
    queryKey: [AssetRevenueQueryKey.Base, accountId, period],
    queryFn: async () => {
      // 注意：这里我们仍然使用服务层的 fetchRevenue 方法
      // 但在实际应用中，accountId 应该从认证上下文中获取
      const metrics = await fetchRevenue(period);
      return { data: { metrics } };
    },
    // 5分钟内认为数据是新鲜的
    staleTime: 1000 * 60 * 5,
    // 10分钟后缓存会被清理
    gcTime: 1000 * 60 * 10,
  });
};

/**
 * 提供给其他组件用来触发资产收益数据更新的钩子
 * @returns 使查询失效的函数
 */
export const useInvalidateAssetRevenue = () => {
  const queryClient = useQueryClient();

  return (accountId: string, period?: string) => {
    if (period) {
      queryClient.invalidateQueries({
        queryKey: [AssetRevenueQueryKey.Base, accountId, period],
      });
    } else {
      // 如果没有指定period，则使该accountId的所有查询失效
      queryClient.invalidateQueries({
        queryKey: [AssetRevenueQueryKey.Base, accountId],
      });
    }
  };
};

/**
 * 直接设置资产收益数据缓存的钩子
 * @returns 设置查询数据的函数
 */
export const useSetAssetRevenueData = () => {
  const queryClient = useQueryClient();

  return (accountId: string, period: string, data: AssetRevenueData) => {
    queryClient.setQueryData([AssetRevenueQueryKey.Base, accountId, period], data);
  };
};
