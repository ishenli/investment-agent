'use client';

import React from 'react';
import { memo, useState } from 'react';
import { Highlighter } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Flexbox } from 'react-layout-kit';
import { ShieldAlert, Check, X } from 'lucide-react';

import { approvePermission, denyPermission } from '@/app/services/permission';

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
  badge: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${token.borderRadiusSM}px;
    font-size: 12px;
    font-weight: 600;
    background: ${token.colorWarningBg};
    color: ${token.colorWarningText};
  `,
  toolName: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  description: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  body: css`
    padding: 12px 16px;
  `,
  metaGrid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  `,
  metaItem: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  metaLabel: css`
    font-size: 11px;
    color: ${token.colorTextTertiary};
  `,
  metaValue: css`
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorText};
    word-break: break-all;
  `,
  codeBlock: css`
    margin-top: 12px;
    border-radius: ${token.borderRadiusSM}px;
    overflow: hidden;
    border: 1px solid ${token.colorBorderSecondary};
  `,
  footer: css`
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid ${token.colorBorderSecondary};
  `,
  btn: css`
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 16px;
    border: none;
    border-radius: ${token.borderRadius}px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.85;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  btnDeny: css`
    background: ${token.colorFillSecondary};
    color: ${token.colorTextSecondary};
  `,
  btnApprove: css`
    background: ${token.colorSuccess};
    color: #fff;
  `,
  hint: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 500;
    animation: hintEnter 0.3s ease both;

    @keyframes hintEnter {
      from {
        opacity: 0;
        transform: scale(0.92);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
  hintApproved: css`
    background: ${token.colorSuccessBg};
    color: ${token.colorSuccess};
    border: 1px solid ${token.colorSuccessBorder};
  `,
  hintDenied: css`
    background: ${token.colorFillSecondary};
    color: ${token.colorTextSecondary};
    border: 1px solid ${token.colorBorderSecondary};
  `,
  hintToolName: css`
    font-weight: 600;
  `,
}));

interface PermissionRequestData {
  permissionRequestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  decisionReason?: string;
  blockedPath?: string;
  description?: string;
}

interface PermissionRequestCardProps {
  data: PermissionRequestData;
}

const PermissionRequestCard = memo<PermissionRequestCardProps>(
  ({ data }) => {
    const { styles, cx } = useStyles();
    const [loading, setLoading] = useState(false);
    const [responded, setResponded] = useState(false);
    const [responseType, setResponseType] = useState<'approved' | 'denied' | null>(null);

    const handleApprove = async () => {
      setLoading(true);
      try {
        const result = await approvePermission(data.permissionRequestId);
        if (result.success) {
          setResponded(true);
          setResponseType('approved');
        } else {
          console.error('Failed to approve permission:', result.error);
        }
      } catch (error) {
        console.error('Error approving permission:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleDeny = async () => {
      setLoading(true);
      try {
        const result = await denyPermission(data.permissionRequestId, 'User denied');
        if (result.success) {
          setResponded(true);
          setResponseType('denied');
        } else {
          console.error('Failed to deny permission:', result.error);
        }
      } catch (error) {
        console.error('Error denying permission:', error);
      } finally {
        setLoading(false);
      }
    };

    if (responded) {
      return (
        <span
          className={cx(
            styles.hint,
            responseType === 'approved' ? styles.hintApproved : styles.hintDenied,
          )}
        >
          {responseType === 'approved' ? <Check size={14} /> : <X size={14} />}
          <span className={styles.hintToolName}>{data.toolName}</span>
          {responseType === 'approved' ? '已授权' : '已拒绝'}
        </span>
      );
    }

    const hasToolInput = Object.keys(data.toolInput).length > 0;
    const hasMeta = !!(data.decisionReason || data.blockedPath);

    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <Flexbox align="center" gap={8} horizontal justify="space-between">
            <Flexbox gap={2}>
              <span className={styles.toolName}>{data.toolName}</span>
              <span className={styles.description}>
                {data.description || '工具需要您的授权才能继续执行'}
              </span>
            </Flexbox>
            <span className={styles.badge}>
              <ShieldAlert size={14} />
              授权
            </span>
          </Flexbox>
        </div>

        {(hasMeta || hasToolInput) && (
          <div className={styles.body}>
            {hasMeta && (
              <div className={styles.metaGrid}>
                {data.decisionReason && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>原因</span>
                    <span className={styles.metaValue}>{data.decisionReason}</span>
                  </div>
                )}
                {data.blockedPath && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>路径</span>
                    <span className={styles.metaValue}>{data.blockedPath}</span>
                  </div>
                )}
              </div>
            )}

            {hasToolInput && (
              <div className={styles.codeBlock}>
                <Highlighter
                  copyable={false}
                  language="json"
                  style={{ background: 'transparent' }}
                  variant="borderless"
                >
                  {JSON.stringify(data.toolInput, null, 2)}
                </Highlighter>
              </div>
            )}
          </div>
        )}

        <div className={styles.footer}>
          <button
            className={cx(styles.btn, styles.btnDeny)}
            disabled={loading}
            onClick={handleDeny}
            type="button"
          >
            <X size={14} />
            {loading ? '处理中...' : '拒绝'}
          </button>
          <button
            className={cx(styles.btn, styles.btnApprove)}
            disabled={loading}
            onClick={handleApprove}
            type="button"
          >
            <Check size={14} />
            {loading ? '处理中...' : '批准'}
          </button>
        </div>
      </div>
    );
  },
);

PermissionRequestCard.displayName = 'PermissionRequestCard';

export default PermissionRequestCard;
