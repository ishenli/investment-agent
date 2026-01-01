import { ReactNode, memo } from 'react';

import BubblesLoading from '@renderer/(pages)/chat/components/BubblesLoading';
import { LOADING_FLAT } from '@renderer/const/message';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';
import { ChatMessage } from '@typings/message';
import React from 'react';

export const DefaultMessage = memo<
  ChatMessage & {
    addIdOnDOM?: boolean;
    editableContent: ReactNode;
    isToolCallGenerating?: boolean;
  }
>(({ id, editableContent, content, isToolCallGenerating, addIdOnDOM = true }) => {
  const editing = useChatStore(chatSelectors.isMessageEditing(id));

  if (isToolCallGenerating) return;

  if (content === LOADING_FLAT && !editing) return <BubblesLoading />;

  return <div id={addIdOnDOM ? id : undefined}>{editableContent}</div>;
});

export const DefaultBelowMessage = memo<ChatMessage>(() => {
  return null;
});

export const DefaultAboveMessage = memo<ChatMessage>(() => {
  return null;
});
