'use client';

import { DESKTOP_HEADER_ICON_SIZE } from '@renderer/const/layoutTokens';
import { useWorkspaceModal } from '@renderer/hooks/useWorkspaceModal';
import { ActionIcon } from '@lobehub/ui';
import { Share2 } from 'lucide-react';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

const ShareModal = React.lazy(() => import('@renderer/(pages)/chat/features/ShareModal'));

interface ShareButtonProps {
  mobile?: boolean;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

const ShareButton = memo<ShareButtonProps>(({ mobile, setOpen, open }) => {
  const [isModalOpen, setIsModalOpen] = useWorkspaceModal(open, setOpen);
  const { t } = useTranslation('chat');
  return (
    <>
      <ActionIcon
        data-aspm-click="c437909.d627188"
        icon={Share2}
        onClick={() => setIsModalOpen(true)}
        size={DESKTOP_HEADER_ICON_SIZE}
        title={t('shareTitle')}
        tooltipProps={{
          placement: 'bottom',
        }}
      />
      <ShareModal onCancel={() => setIsModalOpen(false)} open={isModalOpen} />
    </>
  );
});

export default ShareButton;
