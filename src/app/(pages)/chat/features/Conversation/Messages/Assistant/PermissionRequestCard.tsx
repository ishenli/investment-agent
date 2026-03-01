/**
 * Permission Request Card for Chat Interface
 * 
 * 在聊天界面中显示 Claude SDK 权限请求的专用卡片组件
 * 作为独立卡片在 Assistant 消息下方展示
 */
'use client';

import React from 'react';
import { memo, useState } from 'react';
import { Alert, Highlighter } from '@lobehub/ui';
import { Button, Typography, Flex } from 'antd';
import { createStyles } from 'antd-style';
import { approvePermission, denyPermission } from '@/app/services/permission';

const { Text } = Typography;

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    margin-block: 8px;
    max-width: 600px;
  `,

  description: css`
    color: ${token.colorTextSecondary};
    font-size: 13px;
    margin-bottom: 8px;
  `,

  metaText: css`
    color: ${token.colorTextDescription};
    font-size: 12px;
  `,

  codeBlock: css`
    margin-bottom: 12px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid ${token.colorBorderSecondary};
  `,

  actions: css`
    margin-top: 12px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  `,

  successAlert: css`
    margin-block: 8px;
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
    const { styles } = useStyles();
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
        <div className={styles.successAlert}>
          <Alert
            message={responseType === 'approved' ? '权限已批准' : '权限已拒绝'}
            type={responseType === 'approved' ? 'success' : 'info'}
            showIcon
            variant="filled"
          />
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <Alert
          type="warning"
          showIcon
          variant="outlined"
          message={<span style={{ fontWeight: 600 }}>权限请求: {data.toolName}</span>}
          description={
            <div style={{ marginTop: 8 }}>
              <div className={styles.description}>
                {data.description || `工具需要您的授权才能继续执行。`}
              </div>

              {(data.decisionReason || data.blockedPath) && (
                <Flex vertical gap={4} style={{ marginBottom: 12 }}>
                  {data.decisionReason && (
                    <div className={styles.metaText}>
                      <Text type="secondary">原因:</Text> {data.decisionReason}
                    </div>
                  )}
                  {data.blockedPath && (
                    <div className={styles.metaText}>
                      <Text type="secondary">路径:</Text> {data.blockedPath}
                    </div>
                  )}
                </Flex>
              )}

              {Object.keys(data.toolInput).length > 0 && (
                <div className={styles.codeBlock}>
                  <Highlighter
                    language="json"
                    copyable={false}
                    variant="borderless"
                    style={{ background: 'transparent' }}
                  >
                    {JSON.stringify(data.toolInput, null, 2)}
                  </Highlighter>
                </div>
              )}

              <div className={styles.actions}>
                <Button
                  danger
                  loading={loading}
                  onClick={handleDeny}
                  size="small"
                >
                  ✗ 拒绝
                </Button>
                <Button
                  type="primary"
                  loading={loading}
                  onClick={handleApprove}
                  size="small"
                >
                  ✓ 批准
                </Button>
              </div>
            </div>
          }
        />
      </div>
    );
  }
);

PermissionRequestCard.displayName = 'PermissionRequestCard';

export default PermissionRequestCard;
