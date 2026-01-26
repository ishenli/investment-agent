import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

interface PriceUpdateResult {
  success: boolean;
  message: string;
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

export function usePriceRefresh() {
  const queryClient = useQueryClient();

  const refreshPrices = async () => {
    try {
      const response = await fetch('/api/init');
      const result: PriceUpdateResult = await response.json();

      if (result.success && result.stats) {
        // 显示成功消息
        if (result.stats.failed.length === 0) {
          message.success(`价格更新完成：成功更新 ${result.stats.succeeded} 个持仓价格`);
        } else {
          message.info(`价格更新完成：成功 ${result.stats.succeeded} 个，失败 ${result.stats.failed.length} 个`);
        }

        // 刷新相关查询缓存
        // 使用 Promise.all 并行刷新多个查询
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['positions'] }),
          queryClient.invalidateQueries({ queryKey: ['account'] }),
          queryClient.invalidateQueries({ queryKey: ['summary'] }),
          queryClient.invalidateQueries({ queryKey: ['assets'] }),
        ]);

        console.log('价格更新和缓存刷新完成:', result.stats);
      } else {
        message.error('价格更新失败，请稍后重试');
      }

      return result;
    } catch (error) {
      console.error('价格刷新失败:', error);
      message.error('价格刷新失败，请检查网络连接');
      throw error;
    }
  };

  return {
    refreshPrices,
  };
}

// // 使用示例：
// function MyComponent() {
//   const { refreshPrices } = usePriceRefresh();

//   const handleRefreshClick = async () => {
//     try {
//       await refreshPrices();
//     } catch (error) {
//       console.error('刷新失败:', error);
//     }
//   };

//   return (
//     <Button onClick={handleRefreshClick}>
//       刷新价格
//     </Button>
//   );
// }