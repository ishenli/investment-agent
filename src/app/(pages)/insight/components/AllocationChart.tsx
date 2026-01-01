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

// 资产配置图表组件
export function AllocationChart({
  data,
}: {
  data: Array<{ category: string; allocation: number; benchmark?: number }>;
}) {
  // 如果没有数据，显示空状态
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">资产配置</CardTitle>
          <CardDescription>您的投资组合资产类别分布</CardDescription>
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
        <CardTitle className="text-lg font-semibold">资产配置</CardTitle>
        <CardDescription>您的投资组合资产类别分布</CardDescription>
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
                formatter={(value) => [`${value}%`, '配置比例']}
                labelFormatter={(label) => `类别: ${label}`}
              />
              <Legend />
              <Bar dataKey="allocation" name="当前配置" fill="#8884d8" />
              {data.some((item) => item.benchmark !== undefined) && (
                <Bar dataKey="benchmark" name="基准配置" fill="#82ca9d" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
