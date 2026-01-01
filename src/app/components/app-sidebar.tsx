'use client';

import * as React from 'react';
import {
  IconChartBar,
  IconDatabase,
  IconFileWord,
  IconHelp,
  IconReport,
  IconSearch,
  IconSettings,
  IconReportAnalytics,
  IconWallet,
  IconTrademark,
  IconMessage,
  IconAnalyze,
  IconAsset,
  IconShare3,
  IconTrash,
  IconCirclePlusFilled,
  IconRefresh,
  type Icon,
  IconEye,
  IconAnalyzeFilled,
  IconRobot,
} from '@tabler/icons-react';

import { NavMain } from '@renderer/components/nav-main';
import { NavSecondary } from '@renderer/components/nav-secondary';
import { NavUser } from '@renderer/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@renderer/components/ui/sidebar';
import Link from 'next/link';
import { useAccountStore } from '@renderer/store/account/store';
import { useEffect } from 'react';
import { SwitchAccountDialog } from './switch-account-dialog';
import { NavDocuments } from './nav-documents';
import { GalleryVerticalEnd } from 'lucide-react';

export const data = {
  navMain: [
    {
      title: '账户信息',
      url: '/asset',
      icon: IconWallet,
    },
    {
      title: '持仓管理',
      url: '/asset-management',
      icon: IconAsset,
    },
    {
      title: '交易记录',
      url: '/trade',
      icon: IconTrademark,
    },
    {
      title: 'AI洞察',
      url: '/insight',
      icon: IconEye,
    },
    {
      title: 'AI投顾',
      url: '/chat',
      icon: IconMessage,
    },
    {
      title: 'AI报告',
      url: '/report',
      icon: IconReport,
    },
    //     {
    //   title: 'AI投顾',
    //   url: '/chat-ai',
    //   icon: IconMessage,
    // },
    {
      title: '深度分析',
      url: '/research',
      icon: IconAnalyzeFilled,
    },
  ],
  documents: [
    {
      name: '市场指数',
      url: '/market',
      icon: IconReportAnalytics as Icon,
    },
    {
      name: '市场信息',
      url: '/asset-market-info',
      icon: IconDatabase as Icon,
      dropdownItems: [
        {
          label: '添加市场信息',
          icon: IconCirclePlusFilled as Icon,
          actionType: 'link' as const,
          url: '/asset-market-info-fetcher',
        },
      ],
    },
    {
      name: '资产元数据',
      url: '/asset-meta',
      icon: IconAnalyze as Icon,
    },
    {
      name: '投资笔记',
      url: '/note',
      icon: IconFileWord as Icon,
    },

    // {
    //   name: '术语助理',
    //   url: '#',
    //   icon: IconFileWord as Icon,
    //   dropdownItems: [
    //     {
    //       label: '添加术语',
    //       icon: IconCirclePlusFilled as Icon,
    //       action: () => console.log('添加术语'),
    //     },
    //     {
    //       label: '分享',
    //       icon: IconShare3 as Icon,
    //       action: () => console.log('分享术语助理'),
    //     },
    //     {
    //       label: '删除',
    //       icon: IconTrash as Icon,
    //       action: () => console.log('删除术语助理'),
    //       variant: 'destructive' as const,
    //     },
    //   ],
    // },
  ],
  navSecondary: [
    {
      title: '搜索',
      url: '/search',
      icon: IconSearch,
    },
    {
      title: '首选项',
      url: '/setting',
      icon: IconSettings,
    },
    {
      title: '智能体设置',
      url: '/setting/agent',
      icon: IconRobot,
    },
    // {
    //   title: '帮助',
    //   url: '#',
    //   icon: IconHelp,
    // },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const account = useAccountStore((state) => state.account);
  const showSwitchAccountDialog = useAccountStore((state) => state.showSwitchAccountDialog);
  const initializeAccount = useAccountStore((state) => state.initializeAccount);
  const setShowSwitchAccountDialog = useAccountStore((state) => state.setShowSwitchAccountDialog);

  const userData = {
    name: account?.accountName || '',
    avatar: 'https://pic.616pic.com/ys_bnew_img/00/04/44/cgqCG3yYGS.jpg',
  };

  useEffect(() => {
    initializeAccount();
  }, [initializeAccount]);

  return (
    <Sidebar collapsible="icon" {...props} className="text-dark">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  {/* <GalleryVerticalEnd className="size-4" /> */}
                  <img
                    src="https://mdn.alipayobjects.com/huamei_ptvnul/afts/img/A*ULatSabM6xoAAAAAQeAAAAgAeg-GAQ/original"
                    className="size-6"
                    alt="Investment"
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Investment</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SwitchAccountDialog
        open={showSwitchAccountDialog}
        onClose={() => setShowSwitchAccountDialog(false)}
      />
    </Sidebar>
  );
}
