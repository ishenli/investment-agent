'use client';

import { DraggablePanel, DraggablePanelContainer, type DraggablePanelProps } from '@lobehub/ui';
import { createStyles, useResponsive } from 'antd-style';
import isEqual from 'fast-deep-equal';
import React, { PropsWithChildren, memo, useEffect, useMemo, useState } from 'react';

import { withSuspense } from '@renderer/components/withSuspense';
import { usePinnedAgentState } from '@renderer/hooks/usePinnedAgentState';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import { useGlobalStore } from '@renderer/store/global/store';
import { TOOGLE_PANEL_BUTTON_ID } from '../modules/SessionLayout/TogglePanelButton';

const FOLDER_WIDTH = 270;

export const useStyles = createStyles(({ css, token }) => ({
  panel: css`
    height: 100%;
    color: ${token.colorTextSecondary};

    #${TOOGLE_PANEL_BUTTON_ID} {
      opacity: 0;
      transition: opacity 0.15s ${token.motionEaseInOut};
    }

    &:hover {
      #${TOOGLE_PANEL_BUTTON_ID} {
        opacity: 1;
      }
    }
  `,
}));

const SessionPanel = memo<PropsWithChildren>(({ children }) => {
  const { md = true } = useResponsive();

  const [isPinned] = usePinnedAgentState();

  const { styles } = useStyles();
  // const updatePreference = useUserStore((s) => s.updatePreference);
  //
  const [sessionsWidth, sessionExpandable, updatePreference] = useGlobalStore((s) => [
    systemStatusSelectors.sessionWidth(s),
    systemStatusSelectors.showSessionPanel(s),
    s.updateSystemStatus,
  ]);

  const [cacheExpand, setCacheExpand] = useState<boolean>(Boolean(sessionExpandable));
  const [tmpWidth, setWidth] = useState(sessionsWidth);
  if (tmpWidth !== sessionsWidth) setWidth(sessionsWidth);

  const handleExpand = (expand: boolean) => {
    if (isEqual(expand, sessionExpandable)) return;
    updatePreference({ showSessionPanel: expand });
    setCacheExpand(expand);
  };

  const handleSizeChange: DraggablePanelProps['onSizeChange'] = (_, size) => {
    if (!size) return;
    const nextWidth = typeof size.width === 'string' ? Number.parseInt(size.width) : size.width;
    if (!nextWidth) return;

    if (isEqual(nextWidth, sessionsWidth)) return;
    setWidth(nextWidth);
    updatePreference({ sessionsWidth: nextWidth });
  };

  useEffect(() => {
    if (md && cacheExpand) updatePreference({ showSessionPanel: true });
    if (!md) updatePreference({ showSessionPanel: false });
  }, [md, cacheExpand]);

  const SessionPanel = useMemo(() => {
    return (
      <DraggablePanel
        className={styles.panel}
        defaultSize={{ width: tmpWidth }}
        // 当进入 pin 模式下，不可展开
        expand={!isPinned && sessionExpandable}
        expandable={!isPinned}
        maxWidth={400}
        minWidth={FOLDER_WIDTH}
        mode={md ? 'fixed' : 'float'}
        onExpandChange={handleExpand}
        onSizeChange={handleSizeChange}
        placement="left"
        size={{ height: '100%', width: sessionsWidth }}
      >
        <DraggablePanelContainer style={{ flex: 'none', height: '100%', minWidth: FOLDER_WIDTH }}>
          {children}
        </DraggablePanelContainer>
      </DraggablePanel>
    );
  }, [sessionsWidth, md, isPinned, sessionExpandable, tmpWidth]);

  return SessionPanel;
});

export default withSuspense(SessionPanel);
