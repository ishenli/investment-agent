import { Markdown } from '@lobehub/ui';
import { memo } from 'react';

import React from 'react';
import { useContainerStyles } from '../style';

const Preview = memo<{ content: string }>(({ content }) => {
  const { styles } = useContainerStyles();
  const isMobile = false;

  return (
    <div className={styles.preview} style={{ padding: 12 }}>
      <Markdown variant={isMobile ? 'chat' : undefined}>{content}</Markdown>
    </div>
  );
});

export default Preview;
