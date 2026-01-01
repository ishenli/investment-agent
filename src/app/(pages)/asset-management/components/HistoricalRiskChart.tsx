'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// 历史风险图表组件
export function HistoricalRiskChart({
  data,
}: {
  data: Array<{
    date: string;
    concentration: number;
    allocation: number;
    correlation: number;
    liquidity: number;
  }>;
}) {
  // 如果没有数据，显示空状态
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">历史风险趋势</CardTitle>
          <CardDescription>您的投资组合风险评分历史趋势</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            暂无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">历史风险趋势</CardTitle>
        <CardDescription>您的投资组合风险评分历史趋势</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}`} />
              <Tooltip
                formatter={(value) => [`${value}`, '风险评分']}
                labelFormatter={(label) => `日期: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="concentration"
                name="集中度风险"
                stroke="#ff0000"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="allocation"
                name="资产配置风险"
                stroke="#0000ff"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="correlation"
                name="相关性风险"
                stroke="#00ff00"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="liquidity"
                name="流动性风险"
                stroke="#ff00ff"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
