'use client';

import { Block } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useSendMessage } from '@renderer/(pages)/chat/features/ChatInput/useSend';
import { useChatStore } from '@renderer/store/chat';
import React from 'react';

const useStyles = createStyles(({ css, token, responsive }) => ({
  card: css`
    padding-block: 8px;
    padding-inline: 16px;
    border-radius: 48px;
    background: ${token.colorBgContainer};
    font-size: 14px;
    ${responsive.mobile} {
      padding-block: 8px;
      padding-inline: 16px;
    }
  `,

  container: css`
    padding-block: 0;
    padding-inline: 64px 16px;
  `,

  title: css`
    font-size: 14px;
    color: ${token.colorTextDescription};
  `,
}));

interface OpeningQuestionsProps {
  mobile?: boolean;
  questions: string[];
}

const OpeningQuestions = memo<OpeningQuestionsProps>(({ mobile, questions }) => {
  const [updateInputMessage] = useChatStore((s) => [s.updateInputMessage]);

  const { styles } = useStyles();
  const { send: sendMessage } = useSendMessage();

  return (
    <div className={styles.container}>
      <p className={styles.title}>大家都在问：</p>
      <Flexbox gap={8} horizontal wrap={'wrap'}>
        {questions.slice(0, mobile ? 2 : 5).map((question) => {
          return (
            <Block
              className={styles.card}
              clickable
              key={question}
              onClick={() => {
                updateInputMessage(question);
                sendMessage({ isWelcomeQuestion: true });
              }}
              paddingBlock={8}
              paddingInline={12}
              variant={'outlined'}
            >
              {question}
            </Block>
          );
        })}
      </Flexbox>
    </div>
  );
});

export default OpeningQuestions;
