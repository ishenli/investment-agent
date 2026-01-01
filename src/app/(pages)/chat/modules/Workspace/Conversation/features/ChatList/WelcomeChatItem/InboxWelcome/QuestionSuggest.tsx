'use client';

import Link from 'next/link';
import { ActionIcon, Block } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { shuffle } from 'lodash';
import { ArrowRight } from 'lucide-react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { BRANDING_NAME } from '@renderer/const/branding';
import { useSendMessage } from '@renderer/(pages)/chat/features/ChatInput/useSend';
import { useChatStore } from '@renderer/store/chat';
import React from 'react';

const useStyles = createStyles(({ css, token, responsive }) => ({
  card: css`
    padding-block: 12px;
    padding-inline: 24px;
    border-radius: 48px;

    color: ${token.colorText};

    background: ${token.colorBgContainer};

    ${responsive.mobile} {
      padding-block: 8px;
      padding-inline: 16px;
    }
  `,
  icon: css`
    color: ${token.colorTextSecondary};
  `,
  title: css`
    color: ${token.colorTextDescription};
  `,
}));

const qa = shuffle([
  'q01',
  'q02',
  'q03',
  'q04',
  'q05',
  'q06',
  'q07',
  'q08',
  'q09',
  'q10',
  'q11',
  'q12',
  'q13',
  'q14',
  'q15',
]);

const QuestionSuggest = memo<{ mobile?: boolean }>(({ mobile }) => {
  const [updateInputMessage] = useChatStore((s) => [s.updateInputMessage]);

  const { styles } = useStyles();
  const { send: sendMessage } = useSendMessage();
  return (
    <Flexbox gap={8} width={'100%'}>
      <Flexbox align={'center'} horizontal justify={'space-between'}>
        <div className={styles.title}>大家都在问：</div>
        <Link href={'USAGE_DOCUMENTS'} target={'_blank'}>
          <ActionIcon icon={ArrowRight} size={{ blockSize: 24, size: 16 }} title={'了解更多'} />
        </Link>
      </Flexbox>
      <Flexbox gap={8} horizontal wrap={'wrap'}>
        {qa.slice(0, mobile ? 2 : 5).map((item) => {
          const text = `guide.qa.${item}`;
          return (
            <Block
              align={'center'}
              className={styles.card}
              clickable
              gap={8}
              horizontal
              key={item}
              onClick={() => {
                updateInputMessage(text);
                sendMessage({ isWelcomeQuestion: true });
              }}
              variant={'outlined'}
            >
              {text}
            </Block>
          );
        })}
      </Flexbox>
    </Flexbox>
  );
});

export default QuestionSuggest;
