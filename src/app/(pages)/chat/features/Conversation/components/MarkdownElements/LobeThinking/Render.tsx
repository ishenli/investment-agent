import { memo } from 'react';

import Thinking from '@renderer/(pages)/chat/components/Thinking';
import { ARTIFACT_THINKING_TAG } from '@renderer/const/plugin';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';
import React from 'react';

import { DEFAULT_TRANSITION_MODE } from '@renderer/const/settings';
import { MarkdownElementProps } from '../type';
import { isTagClosed } from '../utils';

const Render = memo<MarkdownElementProps>(({ children, id }) => {
  const [isGenerating] = useChatStore((s) => {
    const message = chatSelectors.getMessageById(id)(s);
    return [!isTagClosed(ARTIFACT_THINKING_TAG, message?.content)];
  });
  const transitionMode = DEFAULT_TRANSITION_MODE;

  return (
    <Thinking
      content={children as string}
      style={{ width: isGenerating ? '100%' : undefined }}
      thinking={isGenerating}
      thinkingAnimated={transitionMode === 'fadeIn' && isGenerating}
    />
  );
});

export default Render;
