import React from 'react';
import ChatHydration from './features/ChatHydration';
import ChatInput from './features/ChatInput';
import ChatList from './features/ChatList';

const ChatConversation = () => {
  return (
    <>
      <ChatList />
      <ChatInput />
      <ChatHydration />
      {/* <ThreadHydration /> */}
    </>
  );
};

ChatConversation.displayName = 'ChatConversation';

export default ChatConversation;
