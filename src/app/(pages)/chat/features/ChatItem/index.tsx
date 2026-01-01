'use client';

import { memo, useMemo } from 'react';

import { ChatItemProps, ChatItem as ChatItemRaw } from '@renderer/(pages)/chat/components/ChatItem';
import React from 'react';

const ChatItem = memo<ChatItemProps>(({ markdownProps = {}, avatar, ...rest }) => {
  const { componentProps, ...restMarkdown } = markdownProps;
  const { general } = {
    general: {
      fontSize: 14,
      highlighterTheme: 'github',
      mermaidTheme: 'default',
    },
  };

  const processedAvatar = useMemo(() => {
    // only process avatar in desktop environment and when avatar url starts with /
    if (!avatar.avatar || typeof avatar.avatar !== 'string' || !avatar.avatar.startsWith('/'))
      return avatar;

    return {
      ...avatar,
    };
  }, [avatar]);

  return (
    <ChatItemRaw
      avatar={processedAvatar}
      fontSize={general.fontSize}
      markdownProps={{
        ...restMarkdown,
        componentProps: {
          ...componentProps,
          highlight: {
            ...componentProps?.highlight,
          },
          mermaid: {
            theme: general.mermaidTheme,
            ...componentProps?.mermaid,
          },
        },
      }}
      {...rest}
    />
  );
});

export default ChatItem;
