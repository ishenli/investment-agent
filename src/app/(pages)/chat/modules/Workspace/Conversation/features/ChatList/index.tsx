import { SkeletonList } from '@renderer/(pages)/chat/features/Conversation';
import React, { Suspense, lazy } from 'react';
import { Flexbox } from 'react-layout-kit';

const Content = lazy(() => import('./Content'));

const ChatList = () => (
  <Flexbox
    flex={1}
    style={{
      overflowX: 'hidden',
      overflowY: 'auto',
      position: 'relative',
    }}
    width={'100%'}
  >
    <Suspense fallback={<SkeletonList />}>
      <Content />
    </Suspense>
  </Flexbox>
);

export default ChatList;
