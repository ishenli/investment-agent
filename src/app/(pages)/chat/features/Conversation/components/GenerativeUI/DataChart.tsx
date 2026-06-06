'use client';

import { createStyles } from 'antd-style';
import { memo, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DataChartProps } from './schemas';

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    overflow: hidden;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
    padding: 16px;
  `,
  title: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
    margin-bottom: 12px;
  `,
}));

const DEFAULT_COLORS = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#ff4d4f',
  '#722ed1',
];

const DataChart = memo<DataChartProps>((props) => {
  const { chartType, title, xAxisLabel, yAxisLabel, series } = props;
  const { styles } = useStyles();

  const chartData = useMemo(() => {
    if (chartType === 'pie') {
      return series[0].data.map((d) => ({
        name: String(d.x),
        value: d.y,
      }));
    }

    const xValues = new Set<string | number>();
    for (const s of series) {
      for (const d of s.data) xValues.add(d.x);
    }

    return [...xValues].map((x) => {
      const point: Record<string, string | number> = { x: String(x) };
      for (const s of series) {
        const match = s.data.find((d) => d.x === x);
        if (match) point[s.name] = match.y;
      }
      return point;
    });
  }, [chartType, series]);

  const renderChart = () => {
    if (chartType === 'pie') {
      return (
        <ResponsiveContainer height={280} width="100%">
          <PieChart>
            <Pie
              cx="50%"
              cy="50%"
              data={chartData}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              nameKey="name"
              outerRadius={90}
            >
              {chartData.map((_, i) => (
                <Cell
                  fill={series[0].color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                  key={i}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer height={280} width="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined} />
            <YAxis label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined} />
            <Tooltip />
            {series.length > 1 && <Legend />}
            {series.map((s, i) => (
              <Bar
                dataKey={s.name}
                fill={s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                key={s.name}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer height={280} width="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined} />
          <YAxis label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined} />
          <Tooltip />
          {series.length > 1 && <Legend />}
          {series.map((s, i) => (
            <Line
              dataKey={s.name}
              dot={false}
              key={s.name}
              stroke={s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className={styles.card}>
      {title && <div className={styles.title}>{title}</div>}
      {renderChart()}
    </div>
  );
});

DataChart.displayName = 'DataChart';

export default DataChart;
