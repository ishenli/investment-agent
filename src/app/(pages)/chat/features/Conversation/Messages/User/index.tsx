import { ReactNode, memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import BubblesLoading from '@renderer/(pages)/chat/components/BubblesLoading';
import { LOADING_FLAT } from '@renderer/const/message';
import { ChatMessage } from '@typings/message';
import React from 'react';

export const UserMessage = memo<
  ChatMessage & {
    editableContent: ReactNode;
  }
>(({ id, editableContent, content, imageList, fileList }) => {
  if (content === LOADING_FLAT) return <BubblesLoading />;

  return (
    <Flexbox gap={8} id={id}>
      {editableContent}
    </Flexbox>
  );
});

export * from './BelowMessage';
export { MarkdownRender as UserMarkdownRender } from './MarkdownRender';
