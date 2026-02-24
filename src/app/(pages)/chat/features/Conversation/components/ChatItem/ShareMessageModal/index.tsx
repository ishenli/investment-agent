import { ChatMessage } from '@typings/message';
import { Modal, Segmented, type SegmentedProps } from '@lobehub/ui';
import React, { memo, useId, useMemo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import ShareImage from './ShareImage';
import ShareText from './ShareText';
import { useTranslation } from 'react-i18next';

enum Tab {
  Screenshot = 'screenshot',
  Text = 'text',
}

interface ShareModalProps {
  message: ChatMessage;
  onCancel: () => void;
  open: boolean;
}

const ShareModal = memo<ShareModalProps>(({ onCancel, open, message }) => {
  const [tab, setTab] = useState<Tab>(Tab.Screenshot);
  const uniqueId = useId();
  const { t } = useTranslation('chat');
  const options: SegmentedProps['options'] = useMemo(
    () => [
      {
        label: '截图',
        value: Tab.Screenshot,
      },
      {
        label: '文本',
        value: Tab.Text,
      },
    ],
    [],
  );

  const isMobile = false;
  return (
    <Modal
      allowFullscreen
      centered={false}
      footer={null}
      onCancel={onCancel}
      open={open}
      title={t('shareTitle')}
      width={1440}
    >
      <Flexbox gap={isMobile ? 8 : 24}>
        <Segmented
          block
          onChange={(value) => setTab(value as Tab)}
          options={options}
          style={{ width: '100%' }}
          value={tab}
          variant={'filled'}
        />
        {tab === Tab.Screenshot && (
          <ShareImage message={message} mobile={isMobile} uniqueId={uniqueId} />
        )}
        {tab === Tab.Text && <ShareText item={message} />}
      </Flexbox>
    </Modal>
  );
});

export default ShareModal;
