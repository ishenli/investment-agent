import { Button, copyToClipboard } from '@lobehub/ui';
import { App } from 'antd';
import isEqual from 'fast-deep-equal';
import { CopyIcon, Notebook } from 'lucide-react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useChatStore } from '@renderer/store/chat';
import { topicSelectors } from '@renderer/store/chat/selectors';
import { ChatMessage } from '@typings/message';

import React from 'react';
import { useStyles } from '../style';
import Preview from './Preview';
import { generateMarkdown } from './template';
import { createNote } from '@/app/services/note';

interface ShareTextProps {
  item: ChatMessage;
}

const ShareText = memo<ShareTextProps>(({ item }) => {
  const { styles } = useStyles();
  const { message } = App.useApp();

  const messages = [item];
  const topic = useChatStore(topicSelectors.currentActiveTopic, isEqual);

  const title = topic?.title || '默认标题';
  const content = generateMarkdown({
    messages,
  }).replaceAll('\n\n\n', '\n');

  const isMobile = false;

  const button = (
    <>
      <Button
        block
        icon={CopyIcon}
        onClick={async () => {
          await copyToClipboard(content);
          message.success('复制成功');
        }}
        size={'large'}
        type={'primary'}
      >
        复制
      </Button>
       <Button
        block
        icon={Notebook}
        onClick={async () => {
          try {
            // 假设有一个 noteService 可以调用
            await createNote({ content, title, tags: ['AI 建议'] })
            message.success('已添加到投资笔记');
          } catch (error) {
            message.error('添加失败');
          }
        }}
        size={'large'}
        type={'default'}
      >
        添加到投资笔记
      </Button>
    </>
  );

  return (
    <>
      <Flexbox className={styles.body} gap={16} horizontal={!isMobile}>
        <Preview content={content} />
        <Flexbox className={styles.sidebar} gap={12}>
          {!isMobile && button}
        </Flexbox>
      </Flexbox>
      {isMobile && (
        <Flexbox className={styles.footer} gap={8} horizontal>
          {button}
        </Flexbox>
      )}
    </>
  );
});

export default ShareText;
