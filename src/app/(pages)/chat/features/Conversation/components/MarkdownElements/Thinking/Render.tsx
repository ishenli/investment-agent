import { memo } from 'react';

import Thinking from '@renderer/(pages)/chat/components/Thinking';
import { DEFAULT_TRANSITION_MODE } from '@renderer/const/settings';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';
import React from 'react';
import { MarkdownElementProps } from '../type';

const isThinkingClosed = (input: string = '') => {
  const openTag = `<think>`;
  const closeTag = `</think>`;

  return input.includes(openTag) && input.includes(closeTag);
};

const Render = memo<MarkdownElementProps>(({ children, id }) => {
  const [isGenerating] = useChatStore((s) => {
    const message = chatSelectors.getMessageById(id)(s);
    return [!isThinkingClosed(message?.content)];
  });
  const citations = useChatStore((s) => {
    const message = chatSelectors.getMessageById(id)(s);
    return message?.search?.citations;
  });

  const transitionMode = DEFAULT_TRANSITION_MODE;

  if (!isGenerating && !children) return;

  return (
    <Thinking
      citations={citations}
      content={children as string}
      thinking={isGenerating}
      thinkingAnimated={transitionMode === 'fadeIn' && isGenerating}
    />
  );
});

export default Render;
