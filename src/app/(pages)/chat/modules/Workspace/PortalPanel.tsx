'use client';

import { DraggablePanel, DraggablePanelContainer, type DraggablePanelProps } from '@lobehub/ui';
import { createStyles, useResponsive } from 'antd-style';
import isEqual from 'fast-deep-equal';
import { PropsWithChildren, memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import {
  CHAT_PORTAL_MAX_WIDTH,
  CHAT_PORTAL_TOOL_UI_WIDTH,
  CHAT_PORTAL_WIDTH,
} from '@renderer/const/layoutTokens';
import { useChatStore } from '@renderer/store/chat';
import { chatPortalSelectors } from '@renderer/store/chat/selectors';
import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';

const useStyles = createStyles(({ css, token }) => ({
  content: css`
    display: flex;
    flex-direction: column;
    height: 100% !important;
  `,
  drawer: css`
    z-index: 10;
    height: 100%;
    background: ${token.colorBgLayout};
  `,
  panel: css`
    overflow: hidden;
    height: 100%;
  `,
}));

const PortalPanel = memo(({ children }: PropsWithChildren) => {
  const { styles } = useStyles();
  const { md = true } = useResponsive();

  const [showPortal, showToolUI, showArtifactUI] = useChatStore((s) => [
    chatPortalSelectors.showPortal(s),
    chatPortalSelectors.showPluginUI(s),
    chatPortalSelectors.showArtifactUI(s),
  ]);

  const [portalWidth, updateSystemStatus] = useGlobalStore((s) => [
    systemStatusSelectors.portalWidth(s),
    s.updateSystemStatus,
  ]);

  const [tmpWidth, setWidth] = useState(portalWidth);
  if (tmpWidth !== portalWidth) setWidth(portalWidth);

  const handleSizeChange: DraggablePanelProps['onSizeChange'] = (_, size) => {
    if (!size) return;
    const nextWidth = typeof size.width === 'string' ? Number.parseInt(size.width) : size.width;
    if (!nextWidth) return;

    if (isEqual(nextWidth, portalWidth)) return;
    setWidth(nextWidth);
    updateSystemStatus({ portalWidth: nextWidth });
  };

  return (
    <DraggablePanel
      className={styles.drawer}
      classNames={{
        content: styles.content,
      }}
      defaultSize={{ width: tmpWidth }}
      expand={showPortal}
      maxWidth={CHAT_PORTAL_MAX_WIDTH}
      minWidth={
        (showArtifactUI || showToolUI) && md
          ? CHAT_PORTAL_TOOL_UI_WIDTH
          : CHAT_PORTAL_WIDTH
      }
      mode={md ? 'fixed' : 'float'}
      onSizeChange={handleSizeChange}
      placement={'right'}
      showHandleWhenCollapsed={false}
      showHandleWideArea={false}
      size={{ height: '100%', width: portalWidth }}
      styles={{
        handle: { display: 'none' },
      }}
    >
      <DraggablePanelContainer
        style={{
          flex: 'none',
          height: '100%',
          maxHeight: '100vh',
          minWidth: CHAT_PORTAL_WIDTH,
        }}
      >
        <Flexbox className={styles.panel}>{children}</Flexbox>
      </DraggablePanelContainer>
    </DraggablePanel>
  );
});

export default PortalPanel;
