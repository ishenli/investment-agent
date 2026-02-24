import { ActionIcon, Button, Tooltip } from '@lobehub/ui';
import { Popconfirm } from 'antd';
import { LucideGalleryVerticalEnd, LucideMessageSquarePlus } from 'lucide-react';
import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useChatStore } from '@renderer/store/chat';
import { useActionSWR } from '@renderer/lib/utils/swr';

const SaveTopic = memo<{ mobile?: boolean }>(({ mobile }) => {
  const { t } = useTranslation('topic');
  const [hasTopic, openNewTopicOrSaveTopic] = useChatStore((s) => [
    !!s.activeTopicId,
    s.openNewTopicOrSaveTopic,
  ]);

  const { mutate, isValidating } = useActionSWR('openNewTopicOrSaveTopic', openNewTopicOrSaveTopic);

  const [confirmOpened, setConfirmOpened] = useState(false);

  const icon = hasTopic ? LucideMessageSquarePlus : LucideGalleryVerticalEnd;
  const desc = t(hasTopic ? 'newTopicButton' : 'saveTopicButton');

  if (mobile) {
    return (
      <Popconfirm
        arrow={false}
        okButtonProps={{ danger: false, type: 'primary' }}
        onConfirm={() => mutate()}
        onOpenChange={setConfirmOpened}
        open={confirmOpened}
        placement={'top'}
        title={
          <Flexbox align={'center'} horizontal style={{ marginBottom: 8 }}>
            <div
              style={{
                marginRight: '16px',
                whiteSpace: 'pre-line',
                wordBreak: 'break-word',
              }}
            >
              {t(hasTopic ? 'confirmNewTopic' : 'confirmSaveTopic')}
            </div>
          </Flexbox>
        }
      >
        <ActionIcon
          aria-label={desc}
          icon={icon}
          loading={isValidating}
          onClick={() => setConfirmOpened(true)}
        />
      </Popconfirm>
    );
  } else {
    return (
      <Tooltip title={desc}>
        <Button aria-label={desc} icon={icon} loading={isValidating} onClick={() => mutate()} />
      </Tooltip>
    );
  }
});

export default SaveTopic;
