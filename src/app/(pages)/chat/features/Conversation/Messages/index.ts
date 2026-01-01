import { useCallback } from 'react';

import { useOpenChatSettings } from '@renderer/hooks/useInterceptingRoutes';
import { useGlobalStore } from '@renderer/store/global';
import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';

import {
  MarkdownCustomRender,
  RenderAboveMessage,
  RenderBelowMessage,
  RenderMessage,
} from '../types';
import { AssistantMessage } from './Assistant';
import AboveMessage from './Assistant/AboveMessage';
import BelowMessage from './Assistant/BelowMessage';
import { DefaultAboveMessage, DefaultBelowMessage, DefaultMessage } from './Default';
import { UserBelowMessage, UserMarkdownRender, UserMessage } from './User';

export const renderMessages: Record<string, RenderMessage> = {
  assistant: AssistantMessage,
  default: DefaultMessage,
  function: DefaultMessage,
  user: UserMessage,
};

export const renderBelowMessages: Record<string, RenderBelowMessage> = {
  default: DefaultBelowMessage,
  user: UserBelowMessage,
  assistant: BelowMessage,
};

export const renderAboveMessages: Record<string, RenderAboveMessage> = {
  default: DefaultAboveMessage,
  assistant: AboveMessage,
};

export const markdownCustomRenders: Record<string, MarkdownCustomRender> = {
  user: UserMarkdownRender,
};

export const useAvatarsClick = (role?: string) => {
  const [isInbox] = useSessionStore((s) => [sessionSelectors.isInboxSession(s)]);
  const [toggleSystemRole] = useGlobalStore((s) => [s.toggleSystemRole]);
  const openChatSettings = useOpenChatSettings();

  return useCallback(() => {
    switch (role) {
      case 'assistant': {
        if (!isInbox) {
          toggleSystemRole(true);
        } else {
          openChatSettings();
        }
      }
    }
  }, [isInbox, role]);
};
