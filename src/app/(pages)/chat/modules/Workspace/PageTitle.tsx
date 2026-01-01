import React, { memo } from 'react';

import PageTitle from '@chat/components/PageTitle';
import { withSuspense } from '@renderer/components/withSuspense';
import { useChatStore } from '@renderer/store/chat';
import { topicSelectors } from '@renderer/store/chat/selectors';
import { useSessionStore } from '@renderer/store/session';
import { sessionMetaSelectors } from '@renderer/store/session/selectors';

const Title = memo(() => {
  const agentTitle = useSessionStore(sessionMetaSelectors.currentAgentTitle);

  const topicTitle = useChatStore((s) => topicSelectors.currentActiveTopic(s)?.title);
  return <PageTitle title={[topicTitle, agentTitle].filter(Boolean).join(' · ')} />;
});

export default withSuspense(Title);
