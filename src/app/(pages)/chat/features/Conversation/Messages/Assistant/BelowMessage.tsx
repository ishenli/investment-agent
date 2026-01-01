'use client';

import { Block } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useSendMessage } from '@renderer/(pages)/chat/features/ChatInput/useSend';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';
import { ChatMessage } from '@typings/message';
import React from 'react';

const useStyles = createStyles(({ css, token, responsive }) => ({
  card: css`
    padding-block: 8px;
    padding-inline: 16px;
    border-radius: 48px;
    background: ${token.colorBgContainer};

    ${responsive.mobile} {
      padding-block: 8px;
      padding-inline: 16px;
    }
  `,

  container: css`
    margin-top: 1em;
    padding-block: 0;
    padding-inline: 0 24px;
  `,

  title: css`
    color: ${token.colorTextDescription};
  `,
}));

const SuggestionBelowMessage = memo<ChatMessage>(({ id, related, role }) => {
  const latest = useChatStore(chatSelectors.latestMessage);
  const [updateInputMessage] = useChatStore((s) => [s.updateInputMessage]);
  const generating = useChatStore(chatSelectors.isMessageGenerating(id));

  const { styles } = useStyles();
  const { send: sendMessage } = useSendMessage();

  const isLastAssistant = latest?.id === id && role === 'assistant' && !!related?.length;

  if (!isLastAssistant) return null;

  return (
    <div className={styles.container}>
      <p className={styles.title}>可以接着问：</p>
      <Flexbox gap={8} horizontal wrap={'wrap'}>
        {related.slice(0, 3).map((suggestion) => {
          return (
            <Block
              className={styles.card}
              clickable
              key={suggestion}
              onClick={() => {
                updateInputMessage(suggestion);
                sendMessage({ isWelcomeQuestion: true });
              }}
              paddingBlock={8}
              paddingInline={12}
              variant={'outlined'}
            >
              {suggestion}
            </Block>
          );
        })}
      </Flexbox>
    </div>
  );
});

export default SuggestionBelowMessage;
