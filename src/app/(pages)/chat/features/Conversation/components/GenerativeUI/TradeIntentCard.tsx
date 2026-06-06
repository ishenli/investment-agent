'use client';

import { createStyles } from 'antd-style';
import { memo, useCallback, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import type { TradeIntentCardProps } from './schemas';

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
  actionBuy: css`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: ${token.borderRadiusSM}px;
    font-size: 12px;
    font-weight: 600;
    background: ${token.colorErrorBg};
    color: ${token.colorError};
  `,
  actionSell: css`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: ${token.borderRadiusSM}px;
    font-size: 12px;
    font-weight: 600;
    background: ${token.colorSuccessBg};
    color: ${token.colorSuccess};
  `,
  symbol: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  displayName: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  detailsGrid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 12px 16px;
  `,
  detailItem: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  detailLabel: css`
    font-size: 11px;
    color: ${token.colorTextTertiary};
  `,
  detailValue: css`
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorText};
  `,
  footer: css`
    padding: 12px 16px;
    border-top: 1px solid ${token.colorBorderSecondary};
  `,
  confirmBtn: css`
    width: 100%;
    padding: 8px 16px;
    border: none;
    border-radius: ${token.borderRadius}px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
    color: #fff;

    &:hover {
      opacity: 0.85;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  confirmBuy: css`
    background: ${token.colorError};
  `,
  confirmSell: css`
    background: ${token.colorSuccess};
  `,
  confirmedBadge: css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border-radius: ${token.borderRadius}px;
    font-size: 14px;
    font-weight: 500;
    background: ${token.colorFillSecondary};
    color: ${token.colorTextSecondary};
  `,
}));

const ACTION_LABELS: Record<string, string> = {
  buy: '买入',
  sell: '卖出',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  market: '市价',
  limit: '限价',
};

const TradeIntentCard = memo<TradeIntentCardProps>((props) => {
  const { action, symbol, displayName, quantity, price, orderType, idempotencyKey } = props;
  const { styles, cx } = useStyles();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/trade-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, symbol, quantity, price, orderType, idempotencyKey }),
      });
      if (res.ok) setConfirmed(true);
    } finally {
      setLoading(false);
    }
  }, [action, symbol, quantity, price, orderType, idempotencyKey]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Flexbox align="center" gap={8} horizontal justify="space-between">
          <Flexbox gap={2}>
            <span className={styles.symbol}>{symbol}</span>
            <span className={styles.displayName}>{displayName}</span>
          </Flexbox>
          <span className={action === 'buy' ? styles.actionBuy : styles.actionSell}>
            {ACTION_LABELS[action] || action}
          </span>
        </Flexbox>
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>数量</span>
          <span className={styles.detailValue}>{quantity}</span>
        </div>
        {price != null && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>价格</span>
            <span className={styles.detailValue}>${price.toFixed(2)}</span>
          </div>
        )}
        {orderType && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>订单类型</span>
            <span className={styles.detailValue}>{ORDER_TYPE_LABELS[orderType] || orderType}</span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {confirmed ? (
          <div className={styles.confirmedBadge}>已确认提交</div>
        ) : (
          <button
            className={cx(styles.confirmBtn, action === 'buy' ? styles.confirmBuy : styles.confirmSell)}
            disabled={loading}
            onClick={handleConfirm}
            type="button"
          >
            {loading ? '提交中...' : `确认${ACTION_LABELS[action] || action}`}
          </button>
        )}
      </div>
    </div>
  );
});

TradeIntentCard.displayName = 'TradeIntentCard';

export default TradeIntentCard;
