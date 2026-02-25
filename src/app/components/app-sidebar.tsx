'use client';

import * as React from 'react';
import {
  IconDatabase,
  IconFileWord,
  IconReport,
  IconSearch,
  IconSettings,
  IconWallet,
  IconTrademark,
  IconMessage,
  IconAnalyze,
  IconAsset,
  IconCirclePlusFilled,
  type Icon,
  IconEye,
  IconAnalyzeFilled,
  IconCamera,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { NavMain } from '@renderer/components/nav-main';
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
import { useAccountStore } from '@renderer/store/account/store';
import { useUserStore } from '@renderer/store/user';
import { useEffect } from 'react';
import { SwitchAccountDialog } from './switch-account-dialog';
import { NavDocuments } from './nav-documents';
import { NavSettings } from './nav-setting';

export const data = {
  navMain: [
    {
      title: 'sidebar.navMain.accountInfo',
      url: '/asset',
      icon: IconWallet,
    },
    {
      title: 'sidebar.navMain.positionManagement',
      url: '/asset-management',
      icon: IconAsset,
    },
    {
      title: 'sidebar.navMain.tradeRecords',
      url: '/trade',
      icon: IconTrademark,
    },
        {
      title: 'sidebar.navMain.aiAdvisor',
      url: '/chat',
      icon: IconMessage,
    },

    {
      title: 'sidebar.navMain.aiInsights',
      url: '/insight',
      icon: IconEye,
    },
    {
      title: 'sidebar.navMain.aiReports',
      url: '/report',
      icon: IconReport,
    },
    //     {
    //   title: 'AI投顾',
    //   url: '/chat-ai',
    //   icon: IconMessage,
    // },
    {
      title: 'sidebar.navMain.deepAnalysis',
      url: '/research',
      icon: IconAnalyzeFilled,
    },
  ],
  documents: [
    // {
    //   name: '市场指数',
    //   url: '/market',
    //   icon: IconReportAnalytics as Icon,
    // },
    {
      name: 'sidebar.documents.marketInfo',
      url: '/asset-market-info',
      icon: IconDatabase as Icon,
      dropdownItems: [
        {
          label: 'sidebar.documents.addMarketInfo',
          icon: IconCirclePlusFilled as Icon,
          actionType: 'link' as const,
          url: '/asset-market-info-fetcher',
        },
      ],
    },
    {
      name: 'sidebar.documents.assetData',
      url: '/asset-meta',
      icon: IconAnalyze as Icon,
    },
    {
      name: 'sidebar.documents.investmentNotes',
      url: '/note',
      icon: IconFileWord as Icon,
    },
    {
      name: 'sidebar.documents.portfolioSnapshot',
      url: '/snapshot',
      icon: IconCamera as Icon,
    },
    {
      name: 'sidebar.documents.search',
      url: '/search',
      icon: IconSearch,
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
  settings: [
    {
      name: 'sidebar.settings.settings',
      url: '/setting',
      icon: IconSettings,
    },
  ]
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation(['components', 'common']);
  const account = useAccountStore((state) => state.account);
  const showSwitchAccountDialog = useAccountStore((state) => state.showSwitchAccountDialog);
  const initializeAccount = useAccountStore((state) => state.initializeAccount);
  const setShowSwitchAccountDialog = useAccountStore((state) => state.setShowSwitchAccountDialog);
  const userAvatar = useUserStore((state) => state.avatar);

  const userData = {
    name: account?.accountName || '',
    avatar: userAvatar,
  };

  useEffect(() => {
    initializeAccount();
  }, [initializeAccount]);

  // 使用翻译函数转换菜单项
  const translatedNavMain = data.navMain.map(item => ({
    ...item,
    title: t(item.title as any)
  }));

  const translatedDocuments = data.documents.map(item => ({
    ...item,
    name: t(item.name as any),
    dropdownItems: item.dropdownItems?.map(dropdownItem => ({
      ...dropdownItem,
      label: t(dropdownItem.label as any)
    }))
  }));

  const translatedSettings = data.settings.map(item => ({
    ...item,
    name: t(item.name as any)
  }));

  return (
    <Sidebar collapsible="icon" {...props} className="text-dark mt-4">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  {/* <GalleryVerticalEnd className="size-4" /> */}
                  <img
                    src="https://mdn.alipayobjects.com/huamei_ptvnul/afts/img/A*ULatSabM6xoAAAAAQeAAAAgAeg-GAQ/original"
                    className="size-6 rounded-full"
                    alt="Investment"
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">{'Investment'}</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={translatedNavMain} />
        <NavDocuments items={translatedDocuments} />
        <NavSettings items={translatedSettings} />
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter className="mb-4">
        <NavUser user={userData} />
      </SidebarFooter>
      <SwitchAccountDialog
        open={showSwitchAccountDialog}
        onClose={() => setShowSwitchAccountDialog(false)}
      />
    </Sidebar>
  );
}
