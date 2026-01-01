'use client';

import { DESKTOP_HEADER_ICON_SIZE } from '@renderer/const/layoutTokens';
import { useWorkspaceModal } from '@renderer/hooks/useWorkspaceModal';
import { ActionIcon } from '@lobehub/ui';
import { Share2 } from 'lucide-react';
import React, { memo } from 'react';

const ShareModal = React.lazy(() => import('@renderer/(pages)/chat/features/ShareModal'));

interface ShareButtonProps {
  mobile?: boolean;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

const ShareButton = memo<ShareButtonProps>(({ mobile, setOpen, open }) => {
  const [isModalOpen, setIsModalOpen] = useWorkspaceModal(open, setOpen);

  return (
    <>
      <ActionIcon
        data-aspm-click="c437909.d627188"
        icon={Share2}
        onClick={() => setIsModalOpen(true)}
        size={DESKTOP_HEADER_ICON_SIZE}
        title="分享"
        tooltipProps={{
          placement: 'bottom',
        }}
      />
      <ShareModal onCancel={() => setIsModalOpen(false)} open={isModalOpen} />
    </>
  );
});

export default ShareButton;
