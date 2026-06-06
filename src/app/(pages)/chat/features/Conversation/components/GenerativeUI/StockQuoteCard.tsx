'use client';

import { createStyles } from 'antd-style';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import type { StockQuoteCardProps } from './schemas';

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    overflow: hidden;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
  header: css`
    padding: 16px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  symbol: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  name: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  price: css`
    font-size: 24px;
    font-weight: 700;
    color: ${token.colorText};
  `,
  changePositive: css`
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorSuccess};
  `,
  changeNegative: css`
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorError};
  `,
  metricsGrid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 12px 16px;
  `,
  metricItem: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  metricLabel: css`
    font-size: 11px;
    color: ${token.colorTextTertiary};
  `,
  metricValue: css`
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorText};
  `,
}));

const StockQuoteCard = memo<StockQuoteCardProps>((props) => {
  const { symbol, displayName, price, change, changePercent, currency, metrics } = props;
  const { styles } = useStyles();

  const isPositive = change >= 0;
  const sign = isPositive ? '+' : '';
  const currencySymbol = currency === 'CNY' ? '¥' : '$';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Flexbox align="center" gap={8} horizontal justify="space-between">
          <Flexbox gap={2}>
            <span className={styles.symbol}>{symbol}</span>
            <span className={styles.name}>{displayName}</span>
          </Flexbox>
          <Flexbox align="flex-end" gap={2}>
            <span className={styles.price}>
              {currencySymbol}
              {price.toFixed(2)}
            </span>
            <span className={isPositive ? styles.changePositive : styles.changeNegative}>
              {sign}
              {change.toFixed(2)} ({sign}
              {changePercent.toFixed(2)}%)
            </span>
          </Flexbox>
        </Flexbox>
      </div>
      {metrics && metrics.length > 0 && (
        <div className={styles.metricsGrid}>
          {metrics.map((metric) => (
            <div className={styles.metricItem} key={metric.label}>
              <span className={styles.metricLabel}>{metric.label}</span>
              <span className={styles.metricValue}>{metric.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

StockQuoteCard.displayName = 'StockQuoteCard';

export default StockQuoteCard;
