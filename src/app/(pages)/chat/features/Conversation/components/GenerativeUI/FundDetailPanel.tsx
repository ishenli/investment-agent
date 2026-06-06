'use client';

import { createStyles } from 'antd-style';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import type { FundDetailPanelProps } from './schemas';

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
  fundName: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  fundCode: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  riskBadge: css`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: ${token.borderRadiusSM}px;
    font-size: 12px;
    font-weight: 500;
  `,
  riskLow: css`
    background: ${token.colorSuccessBg};
    color: ${token.colorSuccess};
  `,
  riskMedium: css`
    background: ${token.colorWarningBg};
    color: ${token.colorWarning};
  `,
  riskHigh: css`
    background: ${token.colorErrorBg};
    color: ${token.colorError};
  `,
  section: css`
    padding: 12px 16px;
  `,
  sectionTitle: css`
    font-size: 12px;
    font-weight: 600;
    color: ${token.colorTextSecondary};
    margin-bottom: 8px;
  `,
  returnsGrid: css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  `,
  returnItem: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: center;
  `,
  returnPeriod: css`
    font-size: 11px;
    color: ${token.colorTextTertiary};
  `,
  returnPositive: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorSuccess};
  `,
  returnNegative: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorError};
  `,
  holdingRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
  `,
  holdingName: css`
    font-size: 13px;
    color: ${token.colorText};
  `,
  holdingBar: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  holdingBarTrack: css`
    width: 80px;
    height: 6px;
    border-radius: 3px;
    background: ${token.colorFillSecondary};
    overflow: hidden;
  `,
  holdingBarFill: css`
    height: 100%;
    border-radius: 3px;
    background: ${token.colorPrimary};
  `,
  holdingPercent: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    min-width: 40px;
    text-align: right;
  `,
}));

const RISK_LABELS: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const FundDetailPanel = memo<FundDetailPanelProps>((props) => {
  const { fundName, fundCode, returnMetrics, riskLevel, holdings } = props;
  const { styles, cx } = useStyles();

  const riskClass = {
    low: styles.riskLow,
    medium: styles.riskMedium,
    high: styles.riskHigh,
  }[riskLevel];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Flexbox align="center" gap={8} horizontal justify="space-between">
          <Flexbox gap={2}>
            <span className={styles.fundName}>{fundName}</span>
            {fundCode && <span className={styles.fundCode}>{fundCode}</span>}
          </Flexbox>
          <span className={cx(styles.riskBadge, riskClass)}>
            {RISK_LABELS[riskLevel] || riskLevel}
          </span>
        </Flexbox>
      </div>

      {returnMetrics.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>收益率</div>
          <div className={styles.returnsGrid}>
            {returnMetrics.map((metric) => (
              <div className={styles.returnItem} key={metric.period}>
                <span className={styles.returnPeriod}>{metric.period}</span>
                <span className={metric.value >= 0 ? styles.returnPositive : styles.returnNegative}>
                  {metric.value >= 0 ? '+' : ''}
                  {metric.value.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {holdings && holdings.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>持仓</div>
          <Flexbox gap={4}>
            {holdings.map((holding) => (
              <div className={styles.holdingRow} key={holding.name}>
                <span className={styles.holdingName}>{holding.name}</span>
                <div className={styles.holdingBar}>
                  <div className={styles.holdingBarTrack}>
                    <div
                      className={styles.holdingBarFill}
                      style={{ width: `${Math.min(holding.percentage, 100)}%` }}
                    />
                  </div>
                  <span className={styles.holdingPercent}>{holding.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </Flexbox>
        </div>
      )}
    </div>
  );
});

FundDetailPanel.displayName = 'FundDetailPanel';

export default FundDetailPanel;
