import Link from 'next/link';
import { App, Empty } from 'antd';
import { createStyles } from 'antd-style';
import React, { memo } from 'react';
import { Center } from 'react-layout-kit';
import LazyLoad from 'react-lazy-load';

import { SESSION_CHAT_URL } from '@renderer/const/url';
import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';
import { LobeAgentSession } from '@typings/session';

import { useSwitchSession } from '@renderer/hooks/useSwitchSession';
import SkeletonList from '../../SkeletonList';
import AddButton from './AddButton';
import SessionItem from './Item';

const useStyles = createStyles(
  ({ css }) => css`
    min-height: 70px;
  `,
);
interface SessionListProps {
  dataSource?: LobeAgentSession[];
  groupId?: string;
  showAddButton?: boolean;
}
const SessionList = memo<SessionListProps>(({ dataSource, groupId, showAddButton = true }) => {
  const { styles } = useStyles();

  const isInit = useSessionStore(sessionSelectors.isSessionListInit);

  const switchSession = useSwitchSession();

  const isEmpty = !dataSource || dataSource.length === 0;
  return !isInit ? (
    <SkeletonList />
  ) : !isEmpty ? (
    dataSource.map(({ id, agentId }) => (
      <LazyLoad className={styles} key={id}>
        <Link
          aria-label={id}
          href={SESSION_CHAT_URL(id)}
          onClick={() => {
            switchSession(id);
          }}
        >
          <SessionItem id={id} agentCode={agentId} />
        </Link>
      </LazyLoad>
    ))
  ) : true ? (
    showAddButton && <AddButton groupId={groupId} />
  ) : (
    <Center>
      <Empty description={'No sessions found.'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </Center>
  );
});

export default SessionList;
