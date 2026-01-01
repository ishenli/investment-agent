import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';
import { ThreadItem } from '@typings/topic';
import { Icon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import { ChevronRight } from 'lucide-react';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

const useStyles = createStyles(({ css, token }) => ({
  active: css`
    background: ${token.colorFillTertiary};
  `,
  container: css`
    cursor: pointer;

    padding-block: 4px;
    padding-inline: 6px;
    border-radius: 6px;

    font-size: 12px;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  extra: css`
    color: ${token.colorTextSecondary};
  `,
}));

const Item = memo<ThreadItem>(({ id, title, lastActiveAt, sourceMessageId }) => {
  const { t } = useTranslation('chat');
  const openThreadInPortal = (id: string, sourceMessageId: string) => {
    console.log(id, sourceMessageId);
  };
  const { styles, cx } = useStyles();
  const [isActive, messageCount] = useChatStore((s) => [
    s.activeThreadId === id,
    chatSelectors.countMessagesByThreadId(id)(s),
  ]);
  const mobile = false;
  return (
    <Flexbox
      align={'baseline'}
      className={cx(styles.container, isActive && styles.active)}
      gap={8}
      horizontal
      onClick={() => {
        if (isActive) return;

        openThreadInPortal(id, sourceMessageId);
      }}
    >
      {title}
      <Flexbox className={styles.extra} horizontal>
        {!!messageCount && 'thread.threadMessageCount'}
        {!mobile && ` · ${dayjs(lastActiveAt).format('YYYY-MM-DD')}`}
        <Icon icon={ChevronRight} />
      </Flexbox>
    </Flexbox>
  );
});

export default Item;
