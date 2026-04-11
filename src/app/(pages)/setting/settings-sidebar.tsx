'use client';

import * as React from 'react';
import {
  IconServer,
  IconSettings,
  IconRobot,
  IconPalette,
  IconAdjustments,
  IconInbox,
  IconBulb,
  IconCurrencyDollar,
  type Icon,
} from '@tabler/icons-react';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@renderer/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export type SettingsCategory = 'provider' | 'tool' | 'agent' | 'theme' | 'general' | 'exchange' | 'about' | 'skills';

const settingsItems: {
  id: SettingsCategory;
  title: string;
  icon: Icon;
  url: string;
  description?: string;
}[] = [
  {
    id: 'general',
    title: '通用设置',
    icon: IconAdjustments,
    url: '/setting/general',
    description: '语言和其他通用配置',
  },
  {
    id: 'provider',
    title: '模型设置',
    icon: IconServer,
    url: '/setting/provider',
    description: '管理模型服务商和配置',
  },
  {
    id: 'tool',
    title: '工具设置',
    icon: IconSettings,
    url: '/setting/tool',
    description: 'API Key 和工具配置',
  },
  {
    id: 'agent',
    title: '智能体设置',
    icon: IconRobot,
    url: '/setting/agent',
    description: '管理 AI 智能体配置',
  },
  {
    id: 'theme',
    title: '主题设置',
    icon: IconPalette,
    url: '/setting/theme',
    description: '切换界面主题',
  },
  {
    id: 'exchange',
    title: '汇率设置',
    icon: IconCurrencyDollar,
    url: '/setting/exchange',
    description: '管理货币汇率配置',
  },
  {
    id: 'skills',
    title: '技能管理',
    icon: IconBulb,
    url: '/setting/skills',
    description: '管理 AI技能配置',
  },
  {
    id: 'about',
    title: '关于',
    icon: IconInbox,
    url: '/setting/about',
    description: '应用基本信息和致谢',
  },
];

interface SettingsSidebarProps {
  activeCategory?: SettingsCategory;
  onCategoryChange?: (category: SettingsCategory) => void;
}

export function SettingsSidebar({
  activeCategory = 'provider',
  onCategoryChange,
}: SettingsSidebarProps) {
  const { t } = useTranslation('setting');
  const pathname = usePathname();

  return (
    <SidebarGroup className="p-2">
      <SidebarMenu>
        {settingsItems.map((item) => {
          const isActive = activeCategory === item.id;

          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                className='cursor-pointer'
                asChild
                tooltip={t(`sidebar.${item.id}`, item.title)}
                isActive={isActive}
                onClick={() => onCategoryChange?.(item.id)}
              >
                <div>
                  <item.icon />
                  <span>{t(`sidebar.${item.id}`, item.title)}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}