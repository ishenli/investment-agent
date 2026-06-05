'use client';

import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

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
  metrics: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 12px 16px;
  `,
}));

const ArtifactSkeleton = memo(() => {
  const { styles } = useStyles();

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Flexbox align="center" gap={8} horizontal justify="space-between">
          <Flexbox gap={4}>
            <Skeleton.Input active size="small" style={{ width: 60, height: 18 }} />
            <Skeleton.Input active size="small" style={{ width: 100, height: 14 }} />
          </Flexbox>
          <Flexbox align="flex-end" gap={4}>
            <Skeleton.Input active size="small" style={{ width: 80, height: 28 }} />
            <Skeleton.Input active size="small" style={{ width: 100, height: 16 }} />
          </Flexbox>
        </Flexbox>
      </div>
      <div className={styles.metrics}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Flexbox gap={2} key={i}>
            <Skeleton.Input active size="small" style={{ width: 50, height: 12 }} />
            <Skeleton.Input active size="small" style={{ width: 70, height: 14 }} />
          </Flexbox>
        ))}
      </div>
    </div>
  );
});

ArtifactSkeleton.displayName = 'ArtifactSkeleton';

export default ArtifactSkeleton;
