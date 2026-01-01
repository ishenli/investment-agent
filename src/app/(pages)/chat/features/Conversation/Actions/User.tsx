import { ActionIconGroup } from '@lobehub/ui';
import { ActionIconGroupItemType } from '@lobehub/ui/es/ActionIconGroup';
import { memo, useContext, useMemo } from 'react';

import { useChatStore } from '@renderer/store/chat';
// import { threadSelectors } from '@renderer/store/chat/slices/thread/selectors';

import React from 'react';
import { InPortalThreadContext } from '../components/ChatItem/InPortalThreadContext';
import { useChatListActionsBar } from '../hooks/useChatListActionsBar';
import { RenderAction } from '../types';

export const UserActionsBar: RenderAction = memo(({ onActionClick, id }) => {
  const [isThreadMode, hasThread] = useChatStore((s) => [!!s.activeThreadId, false]);
  const { regenerate, edit, copy, divider, del, branching } = useChatListActionsBar({ hasThread });

  const inPortalThread = useContext(InPortalThreadContext);
  const inThread = isThreadMode || inPortalThread;

  const items = useMemo(
    () =>
      [regenerate, edit, inThread ? null : branching].filter(Boolean) as ActionIconGroupItemType[],
    [inThread],
  );

  return (
    <ActionIconGroup
      items={items}
      menu={{
        items: [edit, copy, divider, regenerate, del],
      }}
      onActionClick={onActionClick}
    />
  );
});
