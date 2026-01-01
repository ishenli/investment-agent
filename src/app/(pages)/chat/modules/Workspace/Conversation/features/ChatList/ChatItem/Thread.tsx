import { Text } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { CSSProperties, memo } from 'react';
import { Flexbox } from 'react-layout-kit';

// import { threadSelectors } from '@renderer/store/chat/selectors';

import React from 'react';
import ThreadItem from './ThreadItem';

const useStyles = createStyles(({ css, token, isDarkMode }) => ({
  container: css`
    cursor: pointer;

    padding-block: 8px 4px;
    padding-inline: 4px;
    border-radius: 6px;

    background: ${isDarkMode ? token.colorFillTertiary : token.colorFillQuaternary};
  `,
}));

interface ThreadProps {
  id: string;
  placement: 'start' | 'end';
  style?: CSSProperties;
}

const Thread = memo<ThreadProps>(({ id, placement, style }) => {
  const { styles } = useStyles();

  const threads: any[] = [];

  return (
    <Flexbox
      direction={placement === 'end' ? 'horizontal-reverse' : 'horizontal'}
      gap={12}
      paddingInline={16}
      style={{ paddingBottom: 16, ...style }}
    >
      <div style={{ width: 40 }} />
      <Flexbox className={styles.container} gap={4} padding={4} style={{ width: 'fit-content' }}>
        <Flexbox gap={8} horizontal paddingInline={6}>
          <Text style={{ fontSize: 12 }} type={'secondary'}>
            {'thread.title'}
            {threads.length}
          </Text>
        </Flexbox>
        <Flexbox>
          {threads.map((thread) => (
            <ThreadItem key={thread.id} {...thread} />
          ))}
        </Flexbox>
      </Flexbox>
    </Flexbox>
  );
});

export default Thread;
