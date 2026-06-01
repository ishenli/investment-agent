import isEqual from 'fast-deep-equal';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import ChatItem from '@renderer/(pages)/chat/features/ChatItem';
import { useSessionStore } from '@renderer/store/session';
import { agentChatConfigSelectors, agentSelectors, sessionMetaSelectors } from '@renderer/store/session/selectors';
import OpeningQuestions from './OpeningQuestions';

const WelcomeMessage = () => {
  const { t } = useTranslation('chat');
  const type = useSessionStore(agentChatConfigSelectors.displayMode);
  const openingMessage = useSessionStore(agentSelectors.openingMessage);
  const openingQuestions = useSessionStore(agentSelectors.openingQuestions);

  const meta = useSessionStore(sessionMetaSelectors.currentAgentMeta, isEqual);
  const { isAgentEditable } = { isAgentEditable: false };

  const name = meta.title || t('defaultAgent');

  const agentDefaultMessageWithoutEdit = `你好，我是**${name}**，让我们开始对话吧！`;
  const agentDefaultMessage = `你好，我是**${name}**，你可以立即与我开始对话，也可以前往助手设置完善我的信息。`;
  const agentMsg = isAgentEditable ? agentDefaultMessage : agentDefaultMessageWithoutEdit;

  const message = useMemo(() => {
    if (openingMessage) return openingMessage;
    return agentMsg;
  }, [openingMessage, agentMsg]);

  const chatItem = (
    <ChatItem
      avatar={meta}
      editing={false}
      message={message}
      placement={'left'}
      variant={type === 'chat' ? 'bubble' : 'docs'}
    />
  );

  return openingQuestions.length > 0 ? (
    <Flexbox>
      {chatItem}
      <OpeningQuestions mobile={false} questions={openingQuestions} />
    </Flexbox>
  ) : (
    chatItem
  );
};
export default WelcomeMessage;
