'use client';

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
  IconUserPlus,
} from '@tabler/icons-react';

import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@renderer/components/ui/sidebar';
import Link from 'next/link';
import { useState } from 'react';
import { SwitchAccountDialog } from './switch-account-dialog';

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email?: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const [showSwitchAccountDialog, setShowSwitchAccountDialog] = useState(false);

  const handleSwitchAccount = () => {
    setShowSwitchAccountDialog(true);
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
                <IconDotsVertical className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <Link href="/account/create">
                  <DropdownMenuItem>
                    <IconUserPlus />
                    新增账户
                  </DropdownMenuItem>
                </Link>
                <Link href="/account/setting">
                  <DropdownMenuItem>
                    <IconUserCircle />
                    账户设置
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem>
                  <IconNotification />
                  通知
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSwitchAccount}>
                <IconLogout />
                切换账号
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {showSwitchAccountDialog && (
        <SwitchAccountDialog
          open={showSwitchAccountDialog}
          onClose={() => setShowSwitchAccountDialog(false)}
        />
      )}
    </>
  );
}
