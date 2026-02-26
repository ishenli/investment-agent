import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
interface PriceUpdateResult {
  success: boolean;
  message: string;
  data: {
    stats?: {
    total: number;
    succeeded: number;
    failed: Array<{
      symbol: string;
      market: string;
      error: string;
    }>;
    byMarket: {
      US: { attempted: number; succeeded: number; failed: any[] };
      HK: { attempted: number; succeeded: number; failed: any[] };
      CN: { attempted: number; succeeded: number; failed: any[] };
    };
    completeTime: string;
  };
  }
}

export function usePriceRefresh() {
  const queryClient = useQueryClient();

  const { t } = useTranslation('asset');

  const refreshPrices = async () => {
    try {
      const response = await fetch('/api/asset/init');
      const result: PriceUpdateResult = await response.json();

      if (result.success && result.data.stats) {
        // 显示成功消息
        if (result.data.stats.failed.length === 0) {
          message.success(t('priceRefresh.success', { count: result.data.stats.succeeded }));
        } else {
          message.info(t('priceRefresh.partialSuccess', {
            succeeded: result.data.stats.succeeded,
            failed: result.data.stats.failed.length
          }));
        }

        // 刷新相关查询缓存
        // 使用 Promise.all 并行刷新多个查询
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['positions'] }),
          queryClient.invalidateQueries({ queryKey: ['account'] }),
          queryClient.invalidateQueries({ queryKey: ['summary'] }),
          queryClient.invalidateQueries({ queryKey: ['assets'] }),
        ]);

        console.log('价格更新和缓存刷新完成:', result.data.stats);
      } else {
        message.error(t('priceRefresh.failed'));
      }

      return result;
    } catch (error) {
      console.error('价格刷新失败:', error);
      message.error(t('priceRefresh.networkError'));
      throw error;
    }
  };

  return {
    refreshPrices,
  };
}