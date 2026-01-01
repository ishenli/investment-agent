'use client';

import { sessionService } from '@renderer/services/session';
import { useUserStore } from '@renderer/store/user/store';
import { NuqsAdapter } from 'nuqs/adapters/react';
import React, { ReactNode, useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import SessionHydration from './modules/SessionHydration';
import SessionListContent from './modules/SessionListContent';
import Workspace from './modules/Workspace';
import SessionPanel from './layout/SessionPanel';
import WorkspaceLayout from './layout/WorkspaceLayout';
import { App, Spin } from 'antd';
export interface LayoutProps {
  children: ReactNode;
  session: ReactNode;
}

const Layout = ({}: LayoutProps) => {
  const { initUserState } = useUserStore();
  // 初始化
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    async function initSessionConfig() {
      await sessionService.initSessionConfig();
      setIsInitialized(true);
    }
    initSessionConfig();
  }, [isInitialized]);

  if (!isInitialized) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  return (
    <App className="flex-1">
      <NuqsAdapter>
        <Flexbox
          height={'100%'}
          horizontal
          className="relative h-[calc(100vh-2)] bg-background overflow-hidden"
          style={{
            borderLeft: '1px solid #f0f0f0',
            maxWidth: '100%',
            // height: 'calc(100vh-2)',
          }}
          width={'100%'}
        >
          <SessionPanel>
            <SessionListContent />
            <SessionHydration />
          </SessionPanel>
          <WorkspaceLayout>
            <Workspace />
          </WorkspaceLayout>
        </Flexbox>
      </NuqsAdapter>
    </App>
  );
};

Layout.displayName = 'DesktopChatLayout';

export default Layout;
