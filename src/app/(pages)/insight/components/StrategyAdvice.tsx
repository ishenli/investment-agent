'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import { CheckCircle2Icon, CircleIcon, RotateCcwIcon } from 'lucide-react';
import { useStrategyAdviceQuery } from '@renderer/hooks/usePositionQueries';
import { Spinner } from '@renderer/components/ui/spinner';
import { AdviceType } from '@typings/insight';
import { useTranslation } from 'react-i18next';

// 策略建议组件
export function StrategyAdvice() {
  const { t } = useTranslation('insight');
  const {
    data: advice,
    isLoading: isStrategyAdviceLoading,
    refetch,
  } = useStrategyAdviceQuery<AdviceType[]>();

  const [loading, setLoading] = useState(false);

  // 手动触发刷新
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refetch();
    } finally {
      setLoading(false);
    }
  };

  if (isStrategyAdviceLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('actionPlan.title')}</CardTitle>
          <CardDescription>{t('actionPlan.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Spinner />
            <p>{t('loading.analyzing')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  // 如果没有建议，显示空状态
  if (!advice || advice.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('actionPlan.title')}</CardTitle>
          <CardDescription>{t('actionPlan.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">{t('actionPlan.noData')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold">{t('actionPlan.title')}</CardTitle>
            <CardDescription>{t('actionPlan.description')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {t('loading.refreshing')}
              </>
            ) : (
              <>
                <RotateCcwIcon className="h-4 w-4 mr-2" />
                {t('common.refresh')}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {advice.map((item) => (
            <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg border">
              {item.recommended ? (
                <CheckCircle2Icon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <CircleIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-sm">{item.title}</h3>
                  <Badge variant={item.recommended ? 'default' : 'secondary'}>
                    {item.recommended
                      ? t('actionPlan.priority.now')
                      : t('actionPlan.priority.watch')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
