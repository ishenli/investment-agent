'use client';

import { useEffect } from 'react';

import { useChatStore } from '@renderer/store/chat';
import { SendMessageParams } from '@typings/message';
import { useSearchParams } from 'next/navigation';

const MessageFromUrl = () => {
  const updateInputMessage = useChatStore((s) => s.updateInputMessage);
  const sendMessage = (params: SendMessageParams) => {
    // TODO: send message
  };
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams?.get('message');
    if (message) {
      // Remove message from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete('message');
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);

      updateInputMessage(message);
      sendMessage({
        message,
      });
    }
  }, [searchParams, updateInputMessage, sendMessage]);

  return null;
};

export default MessageFromUrl;
