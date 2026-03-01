import { useAgentStore } from '@renderer/store/agent';
import { agentChatConfigSelectors } from '@renderer/store/agent/selectors';
import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';

import { Skeleton } from 'antd';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { ModelTag } from '@lobehub/icons';
import React from 'react';
import HistoryLimitTags from './HistoryLimitTags';

const TitleTags = memo(() => {
  // 从 SessionStore 读取当前会话的模型
  const model = useSessionStore(sessionSelectors.currentSessionModel);

  const enableHistoryCount = useAgentStore(agentChatConfigSelectors.enableHistoryCount);

  return (
    <Flexbox align={'center'} gap={4} horizontal>
      <ModelTag model={model} />
      {/* {isAgentEnableSearch && <SearchTags />} */}
      {/* {showPlugin && plugins?.length > 0 && <PluginTag plugins={plugins} />} */}
      {/* {hasKnowledge && <KnowledgeTag data={enabledKnowledge} />} */}
      {/* {enableHistoryCount && <HistoryLimitTags />} */}
    </Flexbox>
  );
});

export default TitleTags;