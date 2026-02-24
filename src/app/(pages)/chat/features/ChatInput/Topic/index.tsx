import { Button, Tooltip } from '@lobehub/ui';
import { LucideGalleryVerticalEnd, LucideMessageSquarePlus } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useChatStore } from '@renderer/store/chat';
import { useActionSWR } from '@renderer/lib/utils/swr';

const SaveTopic = memo<{ mobile?: boolean }>(({ mobile }) => {
  const { t } = useTranslation('topic');
  const [hasTopic, openNewTopicOrSaveTopic] = useChatStore((s) => [
    !!s.activeTopicId,
    s.openNewTopicOrSaveTopic,
  ]);

  const { mutate } = useActionSWR('openNewTopicOrSaveTopic', openNewTopicOrSaveTopic);

  const icon = hasTopic ? LucideMessageSquarePlus : LucideGalleryVerticalEnd;
  const desc = t(hasTopic ? 'newTopicButton' : 'saveTopicButton');

  return (
    <Tooltip title={desc}>
      <Button aria-label={desc} icon={icon} onClick={() => mutate()} />
    </Tooltip>
  );
});

export default SaveTopic;
