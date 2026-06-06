import { memo } from 'react';

import InputArea from '@renderer/(pages)/chat/features/ChatInput/Desktop/InputArea';
import { useSendMessage } from '@renderer/(pages)/chat/features/ChatInput/useSend';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/slices/message/selectors';
import React from 'react';

const TextArea = memo<{ chatInputExpand?: boolean; onSend?: () => void }>(
  ({ chatInputExpand, onSend }) => {
    const [loading, value, updateInputMessage] = useChatStore((s) => [
      chatSelectors.isAIGenerating(s),
      s.inputMessage,
      s.updateInputMessage,
    ]);
    const { send: sendMessage } = useSendMessage();

    return (
      <InputArea
        chatInputExpand={chatInputExpand}
        loading={loading}
        onChange={updateInputMessage}
        onSend={() => {
          sendMessage();
          onSend?.();
        }}
        value={value}
      />
    );
  },
);

export default TextArea;
