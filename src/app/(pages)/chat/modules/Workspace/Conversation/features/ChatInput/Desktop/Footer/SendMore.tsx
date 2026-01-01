import { Button, Dropdown, Icon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { BotMessageSquare, LucideCheck, LucideChevronDown, MessageSquarePlus } from 'lucide-react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useSendMessage } from '@renderer/(pages)/chat/features/ChatInput/useSend';
import { useChatStore } from '@renderer/store/chat';
import { useUserStore } from '@renderer/store/user';
import { preferenceSelectors } from '@renderer/store/user/selectors';
import React from 'react';

const useStyles = createStyles(({ css, prefixCls }) => {
  return {
    arrow: css`
      &.${prefixCls}-btn.${prefixCls}-btn-icon-only {
        width: 28px;
      }
    `,
  };
});

interface SendMoreProps {
  disabled?: boolean;
  isMac?: boolean;
}

const SendMore = memo<SendMoreProps>(({ disabled, isMac }) => {
  const { styles } = useStyles();

  const [useCmdEnterToSend, updatePreference] = useUserStore((s) => [
    preferenceSelectors.useCmdEnterToSend(s),
    s.updatePreference,
  ]);
  const addAIMessage = useChatStore((s) => s.addAIMessage);

  const { send: sendMessage } = useSendMessage();

  return (
    <Dropdown
      disabled={disabled}
      menu={{
        items: [
          {
            icon: !useCmdEnterToSend ? <Icon icon={LucideCheck} /> : <div />,
            key: 'sendWithEnter',
            label: '按 Enter 键发送',
            onClick: () => {
              updatePreference({ useCmdEnterToSend: false });
            },
          },
          {
            icon: useCmdEnterToSend ? <Icon icon={LucideCheck} /> : <div />,
            key: 'sendWithCmdEnter',
            label: '按 Cmd + Enter 键发送',
            onClick: () => {
              updatePreference({ useCmdEnterToSend: true });
            },
          },
          { type: 'divider' },
          {
            icon: <Icon icon={BotMessageSquare} />,
            key: 'addAi',
            label: '添加一条 AI 消息',
            onClick: () => {
              addAIMessage();
            },
          },
          {
            icon: <Icon icon={MessageSquarePlus} />,
            key: 'addUser',
            label: (
              <Flexbox align={'center'} gap={24} horizontal>
                添加一条用户消息
              </Flexbox>
            ),
            onClick: () => {
              sendMessage({ onlyAddUserMessage: true });
            },
          },
        ],
      }}
      placement={'topRight'}
      trigger={['hover']}
    >
      <Button
        aria-label={'input.more'}
        className={styles.arrow}
        icon={LucideChevronDown}
        type={'primary'}
      />
    </Dropdown>
  );
});

SendMore.displayName = 'SendMore';

export default SendMore;
