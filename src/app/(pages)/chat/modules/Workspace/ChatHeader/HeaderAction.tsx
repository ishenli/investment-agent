'use client';

import { ActionIcon } from '@lobehub/ui';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';
import { useTranslation } from 'react-i18next';

import { DESKTOP_HEADER_ICON_SIZE } from '@renderer/const/layoutTokens';
import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import React from 'react';
import ShareButton from './ShareButton';

const HeaderAction = memo<{ className?: string }>(({ className }) => {
  const { t } = useTranslation('chat');
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
        title={t('toggleTopicPanel')}
        tooltipProps={{
          placement: 'bottom',
        }}
      />
      {/* {'isAgentEditable'} */}
    </Flexbox>
  );
});

export default HeaderAction;
