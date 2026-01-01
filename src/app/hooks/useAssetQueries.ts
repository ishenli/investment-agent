import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAccount,
  fetchPositions,
  fetchTransactions,
  fetchRevenue,
  fetchSummary,
  updateAccountBalance,
} from '@renderer/services/assetService';

// 账户信息查询
export const useAccountQuery = () => {
  return useQuery({
    queryKey: ['account'],
    queryFn: fetchAccount,
    staleTime: 1000 * 60 * 5, // 5分钟内数据视为新鲜
    retry: 1,
  });
};

// 持仓信息查询
export const usePositionsQuery = () => {
  return useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    staleTime: 1000 * 60 * 1, // 1分钟内数据视为新鲜
    retry: 1,
  });
};

// 交易记录查询
export const useTransactionsQuery = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    staleTime: 1000 * 60 * 5, // 5分钟内数据视为新鲜
    retry: 1,
  });
};

// 更新账户余额
export const useUpdateAccountBalanceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAccountBalance,
    onSuccess: (updatedAccount) => {
      // 更新账户查询缓存
      queryClient.setQueryData(['account'], updatedAccount);
      // 使摘要查询失效，因为余额变化会影响摘要数据
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });
};

// 收益信息查询
export const useRevenueQuery = (period: string = '30d') => {
  return useQuery({
    queryKey: ['revenue', period],
    queryFn: () => fetchRevenue(period),
    staleTime: 1000 * 60 * 5, // 5分钟内数据视为新鲜
    retry: 1,
  });
};

// 资产摘要查询
export const useSummaryQuery = () => {
  return useQuery({
    queryKey: ['summary'],
    queryFn: fetchSummary,
    staleTime: 1000 * 60 * 1, // 1分钟内数据视为新鲜
    retry: 1,
  });
};
