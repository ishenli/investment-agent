'use client';

import { Button } from '@renderer/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePriceRefresh } from '@/app/hooks/usePriceRefresh';

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
  const { t } = useTranslation('common');
  const { refreshPrices } = usePriceRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await refreshPrices();
    } catch (error) {
      // 错误已在 usePriceRefresh 中处理
      console.error('价格刷新失败:', error);
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
      title={t('refresh.title')}
    >
      <RotateCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {showText && (isRefreshing ? t('refresh.refreshing') : t('refresh.refreshBalance'))}
    </Button>
  );
}