'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { SnapshotRecord } from '@/app/hooks/useSnapshot';
import type { DisplayCurrency } from '@/app/(pages)/asset/components/asset-dashboard';
import { USD_TO_CNY } from '@/shared/constant';

interface ChartDataPoint {
  date: string;
  totalBalance: number;
  cashBalance: number;
  positionValue: number;
}

function formatSnapshots(snapshots: SnapshotRecord[], displayCurrency: DisplayCurrency): ChartDataPoint[] {
  const rate = displayCurrency === 'CNY' ? USD_TO_CNY : 1;
  return [...snapshots]
    .sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime())
    .map((s) => ({
      date: new Date(s.snapshotDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      totalBalance: (s.totalValueCents / 100) * rate,
      cashBalance: (s.cashBalanceCents / 100) * rate,
      positionValue: (s.positions.totalPositionsValueCents / 100) * rate,
    }));
}

function getYDomain(data: ChartDataPoint[]): [number, number] {
  if (data.length === 0) return [0, 10000];

  const allValues = data.flatMap((d) => [d.totalBalance, d.cashBalance, d.positionValue]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  const range = max - min || max * 0.1 || 1000;
  const padding = range * 0.15;

  const roundToNice = (num: number, direction: 'up' | 'down') => {
    if (num === 0) return 0;
    const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(num))));
    return direction === 'up'
      ? Math.ceil(num / magnitude) * magnitude
      : Math.floor(num / magnitude) * magnitude;
  };

  return [
    Math.max(0, roundToNice(min - padding, 'down')),
    roundToNice(max + padding, 'up'),
  ];
}

export function BalanceTrendChart({ snapshots, displayCurrency = 'USD' }: { snapshots: SnapshotRecord[]; displayCurrency?: DisplayCurrency }) {
  const { t } = useTranslation('asset-trend');
  const data = formatSnapshots(snapshots, displayCurrency);

  if (data.length === 0) return null;

  const yDomain = getYDomain(data);

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="totalBalanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cashBalanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis
            tickFormatter={(value: number) => `${displayCurrency === 'CNY' ? '¥' : '$'}${value.toLocaleString()}`}
            domain={yDomain}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${displayCurrency === 'CNY' ? '¥' : '$'}${value.toLocaleString(displayCurrency === 'CNY' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              name,
            ]}
            labelFormatter={(label) => `${t('chart.date')}: ${label}`}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="totalBalance"
            name={t('chart.totalBalance')}
            stroke="#3b82f6"
            fill="url(#totalBalanceGrad)"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="cashBalance"
            name={t('chart.cashBalance')}
            stroke="#22c55e"
            fill="url(#cashBalanceGrad)"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
