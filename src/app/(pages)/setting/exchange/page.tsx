'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { useExchangeRates } from '@/app/hooks/useExchangeRates';
import { useTranslation } from 'react-i18next';
import { IconRefresh, IconDownload, IconCheck } from '@tabler/icons-react';

export default function ExchangeRateSettingsPage() {
  const { t } = useTranslation('setting');
  const {
    rates,
    isLoading,
    error,
    updateRateAsync,
    fetchOnline,
    resetToDefaults,
    initializeDefaults,
    isUpdating,
    isFetchingOnline,
    isResetting,
  } = useExchangeRates();

  const [editingRates, setEditingRates] = React.useState<Record<string, string>>({});
  const [savedMessage, setSavedMessage] = React.useState<string | null>(null);

  // 初始化：如果数据库为空，自动初始化默认汇率
  React.useEffect(() => {
    if (!isLoading && rates.length === 0) {
      initializeDefaults();
    }
  }, [isLoading, rates.length, initializeDefaults]);

  // 处理汇率编辑
  const handleRateChange = (fromCurrency: string, value: string) => {
    setEditingRates((prev) => ({
      ...prev,
      [fromCurrency]: value,
    }));
  };

  // 保存汇率
  const handleSaveRate = async (fromCurrency: string, toCurrency: string, currentRate: number) => {
    // 优先使用编辑中的值，否则使用当前汇率值
    const rateValue = editingRates[fromCurrency] ?? currentRate.toString();
    const rate = parseFloat(rateValue);
    
    if (isNaN(rate) || rate <= 0) {
      setSavedMessage(t('exchange.rateInvalid', { currency: fromCurrency }));
      setTimeout(() => setSavedMessage(null), 3000);
      return;
    }
    
    try {
      await updateRateAsync({
        fromCurrency,
        toCurrency,
        rate,
      });
      setSavedMessage(t('exchange.rateUpdated', { currency: fromCurrency }));
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save rate:', error);
      setSavedMessage(t('exchange.rateSaveFailed', { currency: fromCurrency }));
      setTimeout(() => setSavedMessage(null), 3000);
    }
  };

  // 从在线获取汇率
  const handleFetchOnline = () => {
    fetchOnline();
  };

  // 重置为默认汇率
  const handleResetToDefaults = () => {
    resetToDefaults();
  };

  // 格式化时间
  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return new Date(time).toLocaleString('zh-CN');
  };

  // 获取汇率来源标签
  const getSourceLabel = (source: string) => {
    return t(`exchange.source.${source}`, source);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-lg text-muted-foreground">{t('exchange.loading', '加载中...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-lg text-destructive">{t('exchange.error', '加载汇率失败')}</div>
        <Button onClick={() => initializeDefaults()}>{t('exchange.initDefaults', '初始化默认汇率')}</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('exchange.title', '汇率设置')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('exchange.description', '管理货币汇率配置，用于货币转换计算')}
          </p>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('exchange.currentRates', '当前汇率')}</CardTitle>
              <CardDescription>
                {t('exchange.currentRatesDescription', '显示各货币对 USD 的转换汇率')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchOnline}
                disabled={isFetchingOnline}
              >
                {isFetchingOnline ? (
                  <IconRefresh className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <IconDownload className="h-4 w-4 mr-2" />
                )}
                {t('exchange.fetchOnline', '从在线获取')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToDefaults}
                disabled={isResetting}
              >
                {t('exchange.resetDefaults', '恢复默认')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {savedMessage && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md flex items-center gap-2">
              <IconCheck className="h-4 w-4" />
              {savedMessage}
            </div>
          )}

          <div className="space-y-4">
            {rates.map((rate) => (
              <div
                key={`${rate.fromCurrency}-${rate.toCurrency}`}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-base font-semibold">
                      {rate.fromCurrency} → {rate.toCurrency}
                    </Label>
                    <span className="text-xs px-2 py-1 bg-muted rounded">
                      {getSourceLabel(rate.source)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('exchange.lastUpdated', '最后更新')}: {formatTime(rate.lastUpdated)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">1 {rate.fromCurrency} =</span>
                    <Input
                      type="number"
                      step="0.0001"
                      value={editingRates[rate.fromCurrency] ?? rate.rate.toFixed(4)}
                      onChange={(e) => handleRateChange(rate.fromCurrency, e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm">{rate.toCurrency}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSaveRate(rate.fromCurrency, rate.toCurrency, rate.rate)}
                    disabled={isUpdating}
                  >
                    {t('exchange.save', '保存')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('exchange.about', '关于汇率')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• {t('exchange.aboutTip1', '汇率用于将不同货币的金额转换为美元进行统一计算')}</p>
            <p>• {t('exchange.aboutTip2', '「从在线获取」将从免费的汇率 API 获取最新的实时汇率')}</p>
            <p>• {t('exchange.aboutTip3', '「恢复默认」将汇率重置为系统预设的默认值')}</p>
            <p>• {t('exchange.aboutTip4', '手动修改的汇率会被保存，直到下次更新')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
