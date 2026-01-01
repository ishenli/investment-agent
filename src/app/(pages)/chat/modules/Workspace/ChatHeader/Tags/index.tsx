import { useAgentStore } from '@renderer/store/agent';
import { agentChatConfigSelectors, agentSelectors } from '@renderer/store/agent/selectors';
import { Skeleton } from 'antd';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { ModelTag } from '@lobehub/icons';
import React from 'react';
import HistoryLimitTags from './HistoryLimitTags';

const TitleTags = memo(() => {
  const [model, isLoading] = useAgentStore((s) => [
    agentSelectors.currentAgentModel(s),
    // agentSelectors.isAgentConfigLoading(s),
    false,
  ]);

  const enableHistoryCount = useAgentStore(agentChatConfigSelectors.enableHistoryCount);

  return isLoading ? (
    <Skeleton.Button active size={'small'} style={{ height: 20 }} />
  ) : (
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
