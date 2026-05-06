import React, { memo, Suspense } from 'react';
import { Flexbox } from 'react-layout-kit';
import ChatHeader from './ChatHeader';
import Conversation from './Conversation';
import Topic from './Topic';
import TopicPanel from './TopicPanel';
import PortalPanel from './PortalPanel';
import PortalBody from './Portal';
import ObservabilityPanelWrapper from './ObservabilityPanel';
import ObservabilityPanelContent from '../../components/ObservabilityPanel';
import BrandTextLoading from '../../components/Loading/BrandTextLoading';

const Page = memo(() => {
  return (
    <>
      <ChatHeader />
      <Flexbox
        height={'100%'}
        horizontal
        style={{
          overflow: 'hidden',
          position: 'relative',
          // backgroundColor: '#fbfbfb',
          backgroundColor: 'var(--antd-bg-color-container)',
        }}
        width={'100%'}
      >
        <Flexbox
          height={'100%'}
          style={{ overflow: 'hidden', position: 'relative' }}
          width={'100%'}
        >
          <Conversation />
        </Flexbox>
        <PortalPanel>
          <Suspense fallback={<BrandTextLoading />}>
            <PortalBody />
          </Suspense>
        </PortalPanel>
        <TopicPanel>
          <Topic />
        </TopicPanel>
        <ObservabilityPanelWrapper>
          <ObservabilityPanelContent />
        </ObservabilityPanelWrapper>
      </Flexbox>
    </>
  );
});

Page.displayName = 'Chat';

export default Page;
