'use client';

import { ActionIcon, Tooltip } from '@lobehub/ui';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { memo } from 'react';

import { DESKTOP_HEADER_ICON_SIZE } from '@renderer/const/layoutTokens';
import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import React from 'react';

export const TOOGLE_PANEL_BUTTON_ID = 'toggle-panel-button';

const TogglePanelButton = memo(() => {
  const showSessionPanel = useGlobalStore(systemStatusSelectors.showSessionPanel);
  const updateSystemStatus = useGlobalStore((s) => s.updateSystemStatus);

  return (
    <Tooltip title="显示/隐藏助手面板">
      <ActionIcon
        icon={showSessionPanel ? PanelLeftClose : PanelLeftOpen}
        id={TOOGLE_PANEL_BUTTON_ID}
        onClick={() => {
          updateSystemStatus({
            sessionsWidth: showSessionPanel ? 23 : 320,
            showSessionPanel: !showSessionPanel,
          });
        }}
        size={DESKTOP_HEADER_ICON_SIZE}
      />
    </Tooltip>
  );
});

export default TogglePanelButton;
