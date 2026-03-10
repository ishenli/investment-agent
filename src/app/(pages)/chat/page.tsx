'use client';

import { sessionService } from '@renderer/services/session';
import { useUserStore } from '@renderer/store/user/store';
import { useAiInfraStore } from '@renderer/store/aiInfra';
import { NuqsAdapter } from 'nuqs/adapters/react';
import React, { ReactNode, useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import SessionHydration from './modules/SessionHydration';
import SessionListContent from './modules/SessionListContent';
import Workspace from './modules/Workspace';
import SessionPanel from './layout/SessionPanel';
import WorkspaceLayout from './layout/WorkspaceLayout';
import { App, Spin } from 'antd';
import { useAccountGuard } from '@renderer/hooks/useAccountGuard';
export interface LayoutProps {
  children: ReactNode;
  session: ReactNode;
}

const Layout = ({}: LayoutProps) => {
  const { initUserState } = useUserStore();
  const { useFetchAvailableModels } = useAiInfraStore();
  // SWR 声明式调用：全局 key 自动去重，无需 useEffect，无需 inflight 锁
  useFetchAvailableModels();
  // 保护页面，确保用户有账户才能访问
  useAccountGuard();
  // 初始化会话（POST /api/chat/sessions）
  const [isSessionReady, setIsSessionReady] = useState(false);
  useEffect(() => {
    // 注意：依赖数组不能包含 isSessionReady。
    // 若包含，setIsSessionReady(true) 会再次触发 effect，
    // 导致 initSessionConfig 被执行两次，产生重复的 POST /api/chat/sessions。
    async function init() {
      await sessionService.initSessionConfig();
      setIsSessionReady(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isSessionReady) {
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
            // borderLeft: '1px solid #f0f0f0',
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
