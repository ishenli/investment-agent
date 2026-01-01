'use client';

import { useRevenueQuery } from '@renderer/hooks/useAssetQueries';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useState } from 'react';
import { Skeleton } from '@renderer/components/ui/skeleton';
import { revenueMetricType } from '@typings/account';

// 扩展收益指标类型以包含计算字段
interface ExtendedRevenueMetricType extends revenueMetricType {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
}

export function RevenueAnalytics() {
  const [period, setPeriod] = useState('30d');

  // 使用React Query获取收益数据
  const { data: metrics, isLoading, isError } = useRevenueQuery(period);

  // Mock chart data - 在实际应用中应该从API获取
  const returnsData = [
    { date: '2023-01', value: 2.5 },
    { date: '2023-02', value: 4.2 },
    { date: '2023-03', value: -1.8 },
    { date: '2023-04', value: 6.1 },
    { date: '2023-05', value: 3.7 },
    { date: '2023-06', value: 8.2 },
  ];

  const drawdownData = [
    { date: '2023-01', value: 0 },
    { date: '2023-02', value: 0 },
    { date: '2023-03', value: -2.5 },
    { date: '2023-04', value: -1.8 },
    { date: '2023-05', value: 0 },
    { date: '2023-06', value: 0 },
  ];

  // 如果还在加载中，显示骨架屏
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(5)].map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-16 mt-2" />
                <Skeleton className="h-3 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-32 mt-2" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <Skeleton className="h-64 w-full rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果获取数据失败
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-500">加载失败</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">无法获取收益数据</div>
              <p className="text-xs text-muted-foreground">请稍后重试</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 如果没有数据
  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">暂无数据</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">暂无收益数据</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 计算扩展指标（这里使用模拟值，实际应该从API获取或计算）
  const extendedMetrics: ExtendedRevenueMetricType = {
    ...metrics,
    totalReturn: metrics.unrealizedProfitRate + metrics.realizedProfitRate,
    annualizedReturn: metrics.unrealizedProfitRate * 12, // 简单的年化计算
    sharpeRatio: 1.2, // 模拟值
    maxDrawdown: 0.085, // 模拟值
    volatility: 0.153, // 模拟值
  };

  return (
    <div className="space-y-6">
      {/* revenue Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收益率</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${extendedMetrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {extendedMetrics.totalReturn >= 0 ? '+' : ''}
              {extendedMetrics.totalReturn.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">相对于初始投资</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">年化收益率</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${extendedMetrics.annualizedReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {extendedMetrics.annualizedReturn >= 0 ? '+' : ''}
              {extendedMetrics.annualizedReturn.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">年化表现</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">夏普比率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{extendedMetrics.sharpeRatio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">风险调整后收益</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">浮动盈亏</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${extendedMetrics.unrealizedProfitRate >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {extendedMetrics.unrealizedProfitRate >= 0 ? '+' : ''}
              {extendedMetrics.unrealizedProfitRate.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">未实现盈亏</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">胜率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {extendedMetrics.winRate ? (extendedMetrics.winRate * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {extendedMetrics.profitableTrades || 0}/{extendedMetrics.totalTrades || 0} 次交易盈利
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Returns Chart */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>收益率</CardTitle>
                <CardDescription>月度收益率表现</CardDescription>
              </div>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">最近7天</SelectItem>
                  <SelectItem value="30d">最近1个月</SelectItem>
                  <SelectItem value="90d">最近3个月</SelectItem>
                  <SelectItem value="365d">最近1年</SelectItem>
                  <SelectItem value="all">全部时间</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={returnsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${value}%`} domain={[-10, 15]} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, '收益率']}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="value" name="收益率" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Drawdown Chart */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>回撤</CardTitle>
                <CardDescription>最大回撤表现</CardDescription>
              </div>
              <Select defaultValue="30d" onValueChange={setPeriod}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">最近7天</SelectItem>
                  <SelectItem value="30d">最近1个月</SelectItem>
                  <SelectItem value="90d">最近3个月</SelectItem>
                  <SelectItem value="365d">最近1年</SelectItem>
                  <SelectItem value="all">全部时间</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={drawdownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${value}%`} domain={[-10, 0]} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, '回撤']}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="回撤"
                    stroke="#ff0000"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>详细指标</CardTitle>
          <CardDescription>投资组合的详细收益指标</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">波动率</p>
              <p className="text-2xl font-bold">
                {extendedMetrics.volatility ? (extendedMetrics.volatility * 100).toFixed(2) : 0}%
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">最大回撤</p>
              <p className="text-2xl font-bold text-red-500">
                {extendedMetrics.maxDrawdown
                  ? `-${(extendedMetrics.maxDrawdown * 100).toFixed(2)}%`
                  : '0%'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">总交易次数</p>
              <p className="text-2xl font-bold">{extendedMetrics.totalTrades || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">盈利交易</p>
              <p className="text-2xl font-bold text-green-500">
                {extendedMetrics.profitableTrades || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
