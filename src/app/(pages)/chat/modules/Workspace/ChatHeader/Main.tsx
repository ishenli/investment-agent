'use client';
import { Avatar } from '@lobehub/ui';
import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import React, { Suspense, memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { usePinnedAgentState } from '@renderer/hooks/usePinnedAgentState';
import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import { useSessionStore } from '@renderer/store/session';
import { sessionMetaSelectors, sessionSelectors } from '@renderer/store/session/selectors';

import { SESSION_CONFIG_TITLE } from '@renderer/const/text/sessionConfig';
import { useInitAgentConfig } from '@renderer/hooks/useInitAgentConfig';
import TogglePanelButton from '../../SessionLayout/TogglePanelButton';
import Tags from './Tags';

const useStyles = createStyles(({ css }) => ({
  container: css`
    position: relative;
    overflow: hidden;
    flex: 1;
    max-width: 100%;
  `,
  tag: css`
    flex: none;
    align-items: baseline;
  `,
  title: css`
    overflow: hidden;

    font-size: 14px;
    font-weight: bold;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));

const Main = memo<{ className?: string }>(({ className }) => {
  const { styles } = useStyles();
  useInitAgentConfig();
  const [isPinned] = usePinnedAgentState();

  const [init, isInbox, title, avatar, backgroundColor] = useSessionStore((s) => [
    sessionSelectors.isSomeSessionActive(s),
    sessionSelectors.isInboxSession(s),
    sessionMetaSelectors.currentAgentTitle(s),
    sessionMetaSelectors.currentAgentAvatar(s),
    sessionMetaSelectors.currentAgentBackgroundColor(s),
  ]);

  const openChatSettings = () => {
    console.log('openChatSettings');
  };

  const displayTitle = isInbox ? SESSION_CONFIG_TITLE.INBOX : title;
  const showSessionPanel = useGlobalStore(systemStatusSelectors.showSessionPanel);

  if (!init)
    return (
      <Flexbox align={'center'} className={className} gap={8} horizontal>
        {!isPinned && !showSessionPanel && <TogglePanelButton />}
        <Skeleton
          active
          avatar={{ shape: 'circle', size: 28 }}
          paragraph={false}
          title={{ style: { margin: 0, marginTop: 4 }, width: 200 }}
        />
      </Flexbox>
    );

  return (
    <Flexbox align={'center'} className={className} gap={12} horizontal>
      {!isPinned && !showSessionPanel && <TogglePanelButton />}
      <Avatar
        avatar={avatar}
        background={backgroundColor}
        onClick={() => openChatSettings()}
        size={32}
        title={title}
      />
      <Flexbox align={'center'} className={styles.container} gap={8} horizontal>
        <div className={styles.title}>{displayTitle}</div>
        <Tags />
      </Flexbox>
    </Flexbox>
  );
});

export default memo<{ className?: string }>(({ className }) => (
  <Suspense
    fallback={
      <Skeleton
        active
        avatar={{ shape: 'circle', size: 'default' }}
        paragraph={false}
        title={{ style: { margin: 0, marginTop: 8 }, width: 200 }}
      />
    }
  >
    <Main className={className} />
  </Suspense>
));
