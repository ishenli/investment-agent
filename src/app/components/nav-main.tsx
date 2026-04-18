'use client';

import { type Icon } from '@tabler/icons-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@renderer/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
  }[];
}) {
  const pathname = usePathname();
  const isAIGenerating = useChatStore(chatSelectors.isAIGenerating);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {/* <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />
              <span>Quick Create</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu> */}
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url;
            const showGeneratingBadge = item.url === '/chat' && isAIGenerating && !isActive;
            return (
              <Link href={item.url} key={item.title}>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                    {item.icon && (
                      <span className="relative">
                        <item.icon size={20} strokeWidth={1.5} />
                        {showGeneratingBadge && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </span>
                    )}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Link>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
