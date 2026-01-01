import { memo } from 'react';

import Thinking from '@renderer/(pages)/chat/components/Thinking';
import { DEFAULT_TRANSITION_MODE } from '@renderer/const/settings';
import { useChatStore } from '@renderer/store/chat';
import { aiChatSelectors } from '@renderer/store/chat/selectors';
import React from 'react';

interface ReasoningProps {
  content?: string;
  duration?: number;
  id: string;
}

const Reasoning = memo<ReasoningProps>(({ content = '', duration, id }) => {
  const isReasoning = useChatStore(aiChatSelectors.isMessageInReasoning(id));
  const transitionMode = DEFAULT_TRANSITION_MODE;

  return (
    <Thinking
      content={content}
      duration={duration}
      thinking={isReasoning}
      thinkingAnimated={transitionMode === 'fadeIn' && isReasoning}
    />
  );
});

export default Reasoning;
