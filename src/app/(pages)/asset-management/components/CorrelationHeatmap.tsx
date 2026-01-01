'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import {
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// 相关性热力图组件
export function CorrelationHeatmap({ data }: { data?: Array<any> }) {
  // 规范化输入，支持 highCorrelationPairs 或任意包含 asset1/asset2/correlation 的数组
  const pairs = (data || []).map((d) => ({
    asset1: d?.asset1 ?? d?.a ?? d?.x ?? d?.left ?? '未知',
    asset2: d?.asset2 ?? d?.b ?? d?.y ?? d?.right ?? '未知',
    correlation: typeof d?.correlation === 'number' ? d.correlation : Number(d?.correlation) || 0,
  }));

  // 如果没有数据，显示空状态
  if (!pairs || pairs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>资产相关性</CardTitle>
          <CardDescription>您的投资组合资产间相关性分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            暂无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  // 为相关性值分配颜色
  const getColor = (correlation: number) => {
    if (correlation >= 0.7) return '#ff0000'; // 强正相关 - 红色
    if (correlation >= 0.3) return '#ff9900'; // 中等正相关 - 橙色
    if (correlation > -0.3) return '#ffff00'; // 弱相关 - 黄色
    if (correlation > -0.7) return '#99cc00'; // 中等负相关 - 浅绿色
    return '#00cc00'; // 强负相关 - 绿色
  };

  // 生成唯一资产列表并映射到索引，方便在坐标轴上显示分类标签
  const assets = Array.from(new Set(pairs.flatMap((p) => [p.asset1, p.asset2])));
  const assetIndex = Object.fromEntries(assets.map((a, i) => [a, i]));

  // 为绘图准备点: x=index(asset1), y=index(asset2), size=abs(correlation)
  const points = pairs.map((p) => ({
    x: assetIndex[p.asset1],
    y: assetIndex[p.asset2],
    asset1: p.asset1,
    asset2: p.asset2,
    correlation: p.correlation,
    size: Math.max(50, Math.abs(p.correlation) * 800), // size range for visibility
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>资产相关性</CardTitle>
        <CardDescription>您的投资组合资产间相关性分析</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={points}
              margin={{
                top: 20,
                right: 20,
                bottom: 20,
                left: 20,
              }}
            >
              <XAxis
                type="number"
                dataKey="x"
                tickFormatter={(v) => assets[v] ?? ''}
                ticks={assets.map((_, i) => i)}
                domain={[0, assets.length - 1]}
              />
              <YAxis
                type="number"
                dataKey="y"
                tickFormatter={(v) => assets[v] ?? ''}
                ticks={assets.map((_, i) => i)}
                domain={[0, assets.length - 1]}
              />
              <ZAxis type="number" dataKey="size" range={[100, 2000]} />
              <Tooltip
                formatter={(value, name, props) => {
                  if (name === 'correlation') return [`${(value as number).toFixed(3)}`, '相关性'];
                  return [value, name];
                }}
                labelFormatter={(label) => `资产对索引: ${label}`}
                content={({ payload }) => {
                  // custom content to show asset names and correlation
                  if (!payload || !payload.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="bg-white p-2 rounded shadow">
                      <div className="font-medium">
                        {p.asset1} - {p.asset2}
                      </div>
                      <div>相关性: {p.correlation.toFixed(3)}</div>
                    </div>
                  );
                }}
              />
              <Legend />
              <Scatter name="相关性" data={points} fill="#8884d8">
                {points.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.correlation)} />
                ))}
              </Scatter>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
