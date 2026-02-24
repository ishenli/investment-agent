'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';

// 资产配置图表组件
export function AllocationChart({
  data,
}: {
  data: Array<{ category: string; allocation: number; benchmark?: number }>;
}) {
  const { t } = useTranslation('asset');
  // 如果没有数据，显示空状态
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('allocationChart.title')}</CardTitle>
          <CardDescription>{t('allocationChart.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            {t('allocationChart.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t('allocationChart.title')}</CardTitle>
        <CardDescription>{t('allocationChart.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip
                formatter={(value) => [`${value}%`, t('allocationChart.allocationRatio')]}
              />
              <Legend />
              <Bar dataKey="allocation" name={t('allocationChart.currentAllocation')} fill="#8884d8" />
              {data.some((item) => item.benchmark !== undefined) && (
                <Bar dataKey="benchmark" name={t('allocationChart.benchmarkAllocation')} fill="#82ca9d" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
