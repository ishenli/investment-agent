import StopLoadingIcon from '@renderer/(pages)/chat/components/StopLoading';
import SaveTopic from '@renderer/(pages)/chat/features/ChatInput/Topic';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';
import { Button } from '@lobehub/ui';
import { Space } from 'antd';
import { createStyles } from 'antd-style';
import { Suspense, memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useSendMessage } from '@renderer/(pages)/chat/features/ChatInput/useSend';
import React from 'react';
import MessageFromUrl from './MessageFromUrl';
import SendMore from './SendMore';

const useStyles = createStyles(({ css, prefixCls, token }) => {
  return {
    arrow: css`
      &.${prefixCls}-btn.${prefixCls}-btn-icon-only {
        width: 28px;
      }
    `,
    loadingButton: css`
      display: flex;
      align-items: center;
    `,
    overrideAntdIcon: css`
      .${prefixCls}-btn.${prefixCls}-btn-icon-only {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,
  };
});

interface FooterProps {
  expand: boolean;
  onExpandChange: (expand: boolean) => void;
}

const Footer = memo<FooterProps>(({ onExpandChange, expand }) => {
  const { styles } = useStyles();

  const [isAIGenerating, stopGenerateMessage] = useChatStore((s) => [
    chatSelectors.isAIGenerating(s),
    s.stopGenerateMessage,
  ]);

  const { send: sendMessage, canSend } = useSendMessage();

  return (
    <>
      <Suspense>
        <MessageFromUrl />
      </Suspense>
      <Flexbox
        data-aspm="c437890"
        data-aspm-expo
        align={'end'}
        className={styles.overrideAntdIcon}
        distribution={'space-between'}
        flex={'none'}
        gap={8}
        horizontal
        paddingInline={16}
      >
        <Flexbox align={'center'} gap={8} horizontal style={{ overflow: 'hidden' }}></Flexbox>
        <Flexbox align={'center'} flex={'none'} gap={8} horizontal>
          <SaveTopic />
          <Flexbox style={{ minWidth: 92 }}>
            {isAIGenerating ? (
              <Button
                className={styles.loadingButton}
                icon={StopLoadingIcon}
                onClick={stopGenerateMessage}
              >
                停止
              </Button>
            ) : (
              <Space.Compact>
                <Button
                  data-aspm-click="d627171"
                  disabled={!canSend}
                  loading={!canSend}
                  onClick={() => {
                    sendMessage();
                    onExpandChange?.(false);
                  }}
                  type={'primary'}
                >
                  发送
                </Button>
                <SendMore disabled={!canSend} isMac={true} />
              </Space.Compact>
            )}
          </Flexbox>
        </Flexbox>
      </Flexbox>
    </>
  );
});

Footer.displayName = 'Footer';

export default Footer;
