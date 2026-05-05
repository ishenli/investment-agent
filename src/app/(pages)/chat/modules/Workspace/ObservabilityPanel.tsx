'use client';

import { DraggablePanel, DraggablePanelContainer } from '@lobehub/ui';
import { createStyles, useResponsive } from 'antd-style';
import isEqual from 'fast-deep-equal';
import { PropsWithChildren, memo, useState } from 'react';

import { CHAT_PORTAL_WIDTH } from '@renderer/const/layoutTokens';
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

const ObservabilityPanelWrapper = memo(({ children }: PropsWithChildren) => {
  const { styles } = useStyles();
  const { md = true } = useResponsive();

  const [showObservability, toggleObservability] = useGlobalStore((s) => [
    systemStatusSelectors.showObservabilityPanel(s),
    s.toggleObservabilityPanel,
  ]);

  const [cacheExpand, setCacheExpand] = useState<boolean>(Boolean(showObservability));

  const handleExpand = (expand: boolean) => {
    if (isEqual(expand, Boolean(showObservability))) return;
    toggleObservability(expand);
    setCacheExpand(expand);
  };

  return (
    <DraggablePanel
      className={styles.drawer}
      classNames={{
        content: styles.content,
      }}
      expand={showObservability}
      minWidth={CHAT_PORTAL_WIDTH}
      mode={md ? 'fixed' : 'float'}
      onExpandChange={handleExpand}
      placement={'right'}
      showHandleWhenCollapsed={false}
      showHandleWideArea={false}
    >
      <DraggablePanelContainer
        style={{
          flex: 'none',
          height: '100%',
          maxHeight: '100vh',
          minWidth: CHAT_PORTAL_WIDTH,
        }}
      >
        {children}
      </DraggablePanelContainer>
    </DraggablePanel>
  );
});

ObservabilityPanelWrapper.displayName = 'ObservabilityPanelWrapper';

export default ObservabilityPanelWrapper;
