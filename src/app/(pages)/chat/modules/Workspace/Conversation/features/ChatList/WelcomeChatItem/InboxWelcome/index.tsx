'use client';

import { BRANDING_NAME } from '@renderer/const/branding';
import { FluentEmoji, Markdown } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { memo } from 'react';
import { Trans } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { useGreeting } from '@renderer/hooks/useGreeting';
import React from 'react';
import AddButton from './AddButton';
import AgentsSuggest from './AgentsSuggest';
import QuestionSuggest from './QuestionSuggest';

const useStyles = createStyles(({ css, responsive }) => ({
  container: css`
    align-items: center;
    ${responsive.mobile} {
      align-items: flex-start;
    }
  `,
  desc: css`
    font-size: 14px;
    text-align: center;
    ${responsive.mobile} {
      text-align: start;
    }
  `,
  title: css`
    margin-block: 0.2em 0;
    font-size: 32px;
    font-weight: bolder;
    line-height: 1;
    ${responsive.mobile} {
      font-size: 24px;
    }
  `,
}));

const InboxWelcome = memo(() => {
  const { styles } = useStyles();
  const greeting = useGreeting();
  const { showWelcomeSuggest, showCreateSession } = {
    showWelcomeSuggest: false,
    showCreateSession: false,
  };

  return (
    <Center padding={16} width={'100%'}>
      <Flexbox className={styles.container} gap={16} style={{ maxWidth: 800 }} width={'100%'}>
        <Flexbox align={'center'} gap={8} horizontal>
          <FluentEmoji emoji={'👋'} size={40} type={'anim'} />
          <h1 className={styles.title}>{greeting}</h1>
        </Flexbox>
        <Markdown
          className={styles.desc}
          customRender={(dom, context) => {
            if (context.text.includes('<plus />')) {
              return (
                <Trans
                  components={{
                    br: <br />,
                    plus: <AddButton />,
                  }}
                  i18nKey="guide.defaultMessage"
                  ns=""
                  values={{ appName: BRANDING_NAME }}
                />
              );
            }
            return dom;
          }}
          variant={'chat'}
        >
          我是你的 AI 助手，请问现在能帮您做什么？
        </Markdown>
        {showWelcomeSuggest && (
          <>
            <AgentsSuggest mobile={false} />
            <QuestionSuggest mobile={false} />
          </>
        )}
      </Flexbox>
    </Center>
  );
});

export default InboxWelcome;
