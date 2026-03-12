import { Icon, Tag, Tooltip } from '@lobehub/ui';
import { HistoryIcon } from 'lucide-react';
import React, { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useSessionStore } from '@renderer/store/session';
import { agentChatConfigSelectors } from '@renderer/store/session/selectors';

const SearchTag = memo(() => {
  const historyCount = useSessionStore(agentChatConfigSelectors.historyCount);

  return (
    <Tooltip title={`助手只会记录${historyCount}条消息`}>
      <Flexbox height={22}>
        <Tag>
          <Icon icon={HistoryIcon} />
          <span>{historyCount}</span>
        </Tag>
      </Flexbox>
    </Tooltip>
  );
});

export default SearchTag;
