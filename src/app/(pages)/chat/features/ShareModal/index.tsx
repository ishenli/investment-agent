import { Modal, type ModalProps, Segmented, type SegmentedProps } from '@lobehub/ui';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import React from 'react';
import ShareImage from './ShareImage';
import ShareJSON from './ShareLink';
import ShareText from './ShareText';

enum Tab {
  JSON = 'json',
  Screenshot = 'screenshot',
  Text = 'text',
}

const ShareModal = memo<ModalProps>(({ onCancel, open }) => {
  const [tab, setTab] = useState<Tab>(Tab.Screenshot);
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
      {
        label: '链接',
        value: Tab.JSON,
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
      title="分享"
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
        {tab === Tab.Screenshot && <ShareImage mobile={isMobile} />}
        {tab === Tab.Text && <ShareText />}
        {tab === Tab.JSON && <ShareJSON />}
      </Flexbox>
    </Modal>
  );
});

export default ShareModal;
