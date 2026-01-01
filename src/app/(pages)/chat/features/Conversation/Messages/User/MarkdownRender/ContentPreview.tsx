import { Button, Markdown, MaskShadow } from '@lobehub/ui';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useChatStore } from '@renderer/store/chat';

interface ContentPreviewProps {
  content: string;
  displayMode: 'chat' | 'docs';
  id: string;
}

const ContentPreview = ({ content, id }: ContentPreviewProps) => {

  // const [openMessageDetail] = useChatStore((s) => [s.openMessageDetail]);

  return (
    <Flexbox>
      <MaskShadow>
        <Markdown variant={'chat'}>{content.slice(0, 1000)}</Markdown>
      </MaskShadow>
      <Flexbox padding={4}>
        <Button
          block
          color={'default'}
          onClick={() => {
            // openMessageDetail(id);
          }}
          size={'small'}
          variant={'filled'}
        >
          {('chatList.longMessageDetail')}
        </Button>
      </Flexbox>
    </Flexbox>
  );
};
export default ContentPreview;
