'use client';

import { Button } from '@renderer/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

interface PriceRefreshButtonProps {
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  showText?: boolean;
}

export function PriceRefreshButton({
  size = 'default',
  className,
  showText = true
}: PriceRefreshButtonProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const response = await fetch('/api/init');
      const result = await response.json();

      console.log('API 响应:', result);

      // 后端返回结构: { success: true, data: { ... } }
      if (result.success && result.data && result.data.stats) {
        const stats = result.data.stats;
        const failedCount = result.data.failedCount || stats.failed.length;

        // 显示成功消息
        if (failedCount === 0) {
          message.success(`价格更新完成：成功更新 ${result.data.updatedCount} 个持仓价格`);
        } else {
          message.info(`价格更新完成：成功 ${result.data.updatedCount} 个，失败 ${failedCount} 个`);
        }

        // 刷新相关查询缓存
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['positions'] }),
          queryClient.invalidateQueries({ queryKey: ['account'] }),
          queryClient.invalidateQueries({ queryKey: ['summary'] }),
          queryClient.invalidateQueries({ queryKey: ['assets'] }),
        ]);
      } else {
        console.error('Unexpected response format:', result);
        message.error('价格更新失败，数据格式异常');
      }
    } catch (error) {
      console.error('价格刷新失败:', error);
      message.error('价格刷新失败，请检查网络连接');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing}
      size={size}
      className={className}
      title="刷新持仓价格"
    >
      <RotateCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {showText && (isRefreshing ? '刷新中...' : '刷新价格')}
    </Button>
  );
}