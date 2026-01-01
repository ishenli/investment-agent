'use client';

import { ActionIcon } from '@lobehub/ui';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { DESKTOP_HEADER_ICON_SIZE } from '@renderer/const/layoutTokens';
import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import React from 'react';
import ShareButton from './ShareButton';

const HeaderAction = memo<{ className?: string }>(({ className }) => {
  const [showAgentSettings, toggleConfig] = useGlobalStore((s) => [
    systemStatusSelectors.showChatSideBar(s),
    s.toggleChatSideBar,
  ]);

  return (
    <Flexbox className={className} gap={4} horizontal>
      <ShareButton />
      <ActionIcon
        icon={showAgentSettings ? PanelRightClose : PanelRightOpen}
        onClick={() => toggleConfig()}
        size={DESKTOP_HEADER_ICON_SIZE}
        title="显示/隐藏话题面板"
        tooltipProps={{
          placement: 'bottom',
        }}
      />
      {/* {'isAgentEditable'} */}
    </Flexbox>
  );
});

export default HeaderAction;
