import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { ChatItem } from '@renderer/(pages)/chat/features/Conversation';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';
import React from 'react';

const ChatList = memo(() => {
  const ids = useChatStore(chatSelectors.mainDisplayChatIDs);

  return (
    <Flexbox height={'100%'} style={{ paddingTop: 24, position: 'relative' }} width={'100%'}>
      {ids.map((id, index) => (
        <ChatItem id={id} index={index} key={id} />
      ))}
    </Flexbox>
  );
});

export default ChatList;
