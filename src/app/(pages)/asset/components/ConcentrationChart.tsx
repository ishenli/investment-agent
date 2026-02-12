'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// 颜色配置
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// 集中度图表组件
export function ConcentrationChart({ data }: { data?: Array<any> }) {
  // 规范化传入的数据，支持多种字段名（symbol/name/asset & weight/value）
  const normalized = (data || [])
    .map((d) => {
      const name = d?.name ?? d?.symbol ?? d?.asset ?? d?.assetSymbol ?? '未知';
      const rawValue = d?.value ?? d?.weight ?? d?.allocation ?? d?.percentage ?? 0;
      const value = typeof rawValue === 'string' ? Number(rawValue) : rawValue;
      return { name, value: Number.isFinite(value) ? value : 0 };
    })
    .filter((d) => d.value > 0);

  // 如果没有数据，显示空状态
  if (!normalized || normalized.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">资产集中度</CardTitle>
          <CardDescription>您的投资组合资产分布</CardDescription>
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
        <CardTitle className="text-lg font-semibold">资产集中度</CardTitle>
        <CardDescription>您的投资组合资产分布</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={normalized}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) =>
                  `${name}: ${Number.isFinite(percent) ? (percent * 100).toFixed(0) : '0'}%`
                }
              >
                {normalized.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => {
                  // value 可能是数字，显示带 % 的字符串更友好
                  const v = typeof value === 'number' ? value : Number(value);
                  return [`${Number.isFinite(v) ? v.toFixed(2) : value}`, '占比'];
                }}
                labelFormatter={(label) => `资产: ${label}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
