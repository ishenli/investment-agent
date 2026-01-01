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

// 流动性图表组件
export function LiquidityChart({
  data,
}: {
  data: Array<{ asset: string; liquidityScore: number }>;
}) {
  // 如果没有数据，显示空状态
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">资产流动性</CardTitle>
          <CardDescription>您的投资组合资产流动性评分</CardDescription>
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
        <CardTitle className="text-lg font-semibold">资产流动性</CardTitle>
        <CardDescription>您的投资组合资产流动性评分</CardDescription>
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
              <XAxis dataKey="asset" angle={-45} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}`} />
              <Tooltip
                formatter={(value) => [`${value}`, '流动性评分']}
                labelFormatter={(label) => `资产: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="liquidityScore"
                name="流动性评分"
                stroke="#8884d8"
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
