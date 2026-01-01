import { useCallback, useMemo } from 'react';

import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';
import { SendMessageParams } from '@typings/message';

export type UseSendMessageParams = Pick<
  SendMessageParams,
  'onlyAddUserMessage' | 'isWelcomeQuestion'
>;

export const useSendMessage = () => {
  const [sendMessage, updateInputMessage] = useChatStore((s) => [
    s.sendMessage,
    s.updateInputMessage,
  ]);

  const isSendButtonDisabledByMessage = useChatStore(chatSelectors.isSendButtonDisabledByMessage);

  const canSend = !isSendButtonDisabledByMessage;

  const send = useCallback((params: UseSendMessageParams = {}) => {
    const store = useChatStore.getState();
    if (chatSelectors.isAIGenerating(store)) return;

    // if uploading file or send button is disabled by message, then we should not send the message
    const isSendButtonDisabledByMessage = chatSelectors.isSendButtonDisabledByMessage(
      useChatStore.getState(),
    );

    const canSend = !isSendButtonDisabledByMessage;
    if (!canSend) return;

    // if there is no message and no image, then we should not send the message
    if (!store.inputMessage) return;

    sendMessage({
      files: [],
      message: store.inputMessage,
      ...params,
    });

    updateInputMessage('');
  }, []);

  return useMemo(() => ({ canSend, send }), [canSend]);
};
