'use client';

import { createStyles } from 'antd-style';
import { memo } from 'react';

import type { UIArtifact } from './schemas';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    padding: 12px 16px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorFillQuaternary};
    color: ${token.colorTextSecondary};
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
  `,
}));

interface FallbackProps {
  artifact: UIArtifact;
}

const Fallback = memo<FallbackProps>(({ artifact }) => {
  const { styles } = useStyles();
  return <div className={styles.container}>{artifact.fallbackText}</div>;
});

Fallback.displayName = 'GenerativeUIFallback';

export default Fallback;
