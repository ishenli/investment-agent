import { ActionIcon } from '@lobehub/ui';
import { Maximize2, Minimize2, Monitor } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import ActionBar from '@renderer/(pages)/chat/features/ChatInput/ActionBar';
import React from 'react';
import { ActionKeys } from '../../ActionBar/config';
import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import { DESKTOP_HEADER_ICON_SIZE } from '@renderer/const/layoutTokens';

interface HeaderProps {
  expand: boolean;
  leftActions: ActionKeys[];
  rightActions: ActionKeys[];
  setExpand: (expand: boolean) => void;
}

const Header = memo<HeaderProps>(({ expand, setExpand, leftActions, rightActions }) => {
  const { t } = useTranslation('chat');
  const [showObservability, toggleObservability] = useGlobalStore((s) => [
    systemStatusSelectors.showObservabilityPanel(s),
    s.toggleObservabilityPanel,
  ]);

  return (
    <ActionBar
      leftActions={leftActions}
      rightActions={rightActions}
      rightAreaStartRender={
        <ActionIcon
          active={showObservability}
          icon={Monitor}
          onClick={() => toggleObservability()}
          size={DESKTOP_HEADER_ICON_SIZE}
          style={{ color: showObservability ? 'var(--colorPrimary)' : undefined }}
          title={t('observability.title')}
          tooltipProps={{
            placement: 'bottom',
          }}
        />
      }
      rightAreaEndRender={
        <ActionIcon
          icon={expand ? Minimize2 : Maximize2}
          onClick={() => {
            setExpand(!expand);
          }}
        />
      }
    />
  );
});

export default Header;
