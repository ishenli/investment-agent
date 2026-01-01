import type { ActionIconGroupItemType } from '@lobehub/ui';
import { ActionIconGroup } from '@lobehub/ui';
import { memo, useContext, useMemo } from 'react';

import { useChatStore } from '@renderer/store/chat';

import React from 'react';
import { InPortalThreadContext } from '../components/ChatItem/InPortalThreadContext';
import { useChatListActionsBar } from '../hooks/useChatListActionsBar';
import { RenderAction } from '../types';
import { ErrorActionsBar } from './Error';

export const AssistantActionsBar: RenderAction = memo(({ onActionClick, error, tools, id }) => {
  const [isThreadMode, hasThread] = useChatStore((s) => [!!s.activeThreadId, false]);

  const {
    regenerate,
    edit,
    delAndRegenerate,
    copy,
    divider,
    del,
    branching,
    // export: exportPDF,
    share,
    like,
    notLike,
  } = useChatListActionsBar({ hasThread });

  const hasTools = !!tools;

  const inPortalThread = useContext(InPortalThreadContext);
  const inThread = isThreadMode || inPortalThread;

  const items = useMemo(() => {
    if (hasTools) return [delAndRegenerate, copy, share];

    return [edit, copy, inThread ? null : branching, share, like, notLike].filter(
      Boolean,
    ) as ActionIconGroupItemType[];
  }, [inThread, hasTools]);

  if (error) return <ErrorActionsBar onActionClick={onActionClick} />;

  return (
    <ActionIconGroup
      items={items}
      menu={{
        items: [
          edit,
          copy,
          divider,
          share,
          divider,
          like,
          notLike,
          // exportPDF,
          divider,
          regenerate,
          delAndRegenerate,
          del,
        ],
      }}
      onActionClick={onActionClick}
    />
  );
});
