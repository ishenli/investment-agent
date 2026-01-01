'use client';

import { IconDots, IconFolder, IconShare3, IconTrash, type Icon } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@renderer/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function NavDocuments({
  items,
}: {
  items: {
    name: string;
    url: string;
    icon: Icon;
    dropdownItems?: (
      | {
          label: string;
          icon: Icon;
          action: () => void;
          variant?: 'default' | 'destructive';
        }
      | {
          label: string;
          icon: Icon;
          actionType?: 'navigate' | 'link';
          url: string;
          variant?: 'default' | 'destructive';
        }
    )[];
  }[];
}) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>知识库</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname.startsWith(item.url);
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={isActive}>
                <Link href={item.url} className="text-black">
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
              {item.dropdownItems && item.dropdownItems.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction
                      showOnHover
                      className="data-[state=open]:bg-accent rounded-sm"
                    >
                      <IconDots />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 rounded-lg"
                    side={isMobile ? 'bottom' : 'right'}
                    align={isMobile ? 'end' : 'start'}
                  >
                    {item.dropdownItems.map((dropdownItem, index) => {
                      // 如果是链接类型，渲染为<a>标签
                      if ('actionType' in dropdownItem && dropdownItem.actionType === 'link') {
                        return (
                          <DropdownMenuItem key={index} variant={dropdownItem.variant} asChild>
                            <Link href={dropdownItem.url}>
                              <dropdownItem.icon className="mr-2 h-4 w-4" />
                              <span>{dropdownItem.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      }

                      // 否则使用onClick处理程序
                      return (
                        <DropdownMenuItem
                          key={index}
                          variant={dropdownItem.variant}
                          onClick={
                            'actionType' in dropdownItem && dropdownItem.actionType === 'navigate'
                              ? () => router.push(dropdownItem.url)
                              : 'action' in dropdownItem
                                ? dropdownItem.action
                                : undefined
                          }
                        >
                          <dropdownItem.icon className="mr-2 h-4 w-4" />
                          <span>{dropdownItem.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
