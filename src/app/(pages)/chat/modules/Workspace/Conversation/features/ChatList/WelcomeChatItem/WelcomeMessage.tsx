import isEqual from 'fast-deep-equal';
import qs from 'query-string';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import ChatItem from '@renderer/(pages)/chat/features/ChatItem';
import { useAgentStore } from '@renderer/store/agent';
import { agentChatConfigSelectors, agentSelectors } from '@renderer/store/agent/selectors';
import { useChatStore } from '@renderer/store/chat';
import { useSessionStore } from '@renderer/store/session';
import { sessionMetaSelectors } from '@renderer/store/session/selectors';
import OpeningQuestions from './OpeningQuestions';

const WelcomeMessage = () => {
  const { t } = useTranslation('chat');
  const type = useAgentStore(agentChatConfigSelectors.displayMode);
  const openingMessage = useAgentStore(agentSelectors.openingMessage);
  const openingQuestions = useAgentStore(agentSelectors.openingQuestions);

  const meta = useSessionStore(sessionMetaSelectors.currentAgentMeta, isEqual);
  const { isAgentEditable } = { isAgentEditable: false };
  const activeId = useChatStore((s) => s.activeId);

  const name = meta.title || t('defaultAgent');
  const systemRole = meta.description;
  const url = qs.stringifyUrl({
    query: { session: activeId },
    url: '/chat/settings',
  });

  const agentSystemRoleMsg = `你好，我是**${name}**，${systemRole}，让我们开始对话吧！`;
  const agentDefaultMessageWithoutEdit = `你好，我是**${name}**，让我们开始对话吧！`;
  const agentDefaultMessage = `你好，我是**${name}**，你可以立即与我开始对话，也可以前往 [助手设置](${url}) 完善我的信息。`;
  const agentMsg = isAgentEditable ? agentDefaultMessage : agentDefaultMessageWithoutEdit;

  const message = useMemo(() => {
    if (openingMessage) return openingMessage;
    return !!meta.description ? agentSystemRoleMsg : agentMsg;
  }, [openingMessage, agentSystemRoleMsg, agentMsg, meta.description]);

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
