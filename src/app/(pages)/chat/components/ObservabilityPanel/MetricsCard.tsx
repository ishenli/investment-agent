'use client';

import React, { memo } from 'react';
import { Card } from 'antd';
import { Flexbox } from 'react-layout-kit';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    min-width: 120px;
    border-radius: ${token.borderRadiusLG}px;
    text-align: center;
  `,
  label: css`
    color: ${token.colorTextSecondary};
    font-size: 12px;
    margin-bottom: 4px;
  `,
  value: css`
    font-size: 18px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  sub: css`
    font-size: 11px;
    color: ${token.colorTextTertiary};
    margin-top: 2px;
  `,
}));

interface MetricsCardProps {
  label: string;
  value: string;
  subValue?: string;
}

const MetricsCard = memo<MetricsCardProps>(({ label, value, subValue }) => {
  const { styles } = useStyles();
  return (
    <Card className={styles.card} size="small" variant="borderless">
      <Flexbox>
        <div className={styles.label}>{label}</div>
        <div className={styles.value}>{value}</div>
        {subValue && <div className={styles.sub}>{subValue}</div>}
      </Flexbox>
    </Card>
  );
});

MetricsCard.displayName = 'MetricsCard';

export default MetricsCard;
