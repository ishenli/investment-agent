import { ActionIconGroup, type ActionIconGroupEvent, type ActionIconGroupProps } from '@lobehub/ui';
import { App } from 'antd';
import isEqual from 'fast-deep-equal';
import qs from 'query-string';
import { memo, use, useCallback, useState } from 'react';

import { VirtuosoContext } from '@renderer/(pages)/chat/features/Conversation/components/VirtualizedList/VirtuosoContext';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';
import { MessageRoleType } from '@typings/message';

import React from 'react';
import { renderActions } from '../../Actions';
import { useChatListActionsBar } from '../../hooks/useChatListActionsBar';
import FeedBackModal, { FeedbackOptions } from './FeedBackModal';
import ShareMessageModal from './ShareMessageModal';

export type ActionsBarProps = ActionIconGroupProps;

const ActionsBar = memo<ActionsBarProps>((props) => {
  const { regenerate, edit, copy, divider, del } = useChatListActionsBar();

  return (
    <ActionIconGroup
      items={[regenerate, edit]}
      menu={{
        items: [edit, copy, regenerate, divider, del],
      }}
      {...props}
    />
  );
});

interface ActionsProps {
  id: string;
  inPortalThread?: boolean;
  index: number;
}

const Actions = memo<ActionsProps>(({ id, inPortalThread, index }) => {
  const item = useChatStore(chatSelectors.getMessageById(id), isEqual);
  const [
    deleteMessage,
    regenerateMessage,
    delAndRegenerateMessage,
    copyMessage,
    toggleMessageEditing,
    likeMessage,
  ] = useChatStore((s) => [
    s.deleteMessage,
    s.regenerateMessage,
    s.delAndRegenerateMessage,
    s.copyMessage,
    s.toggleMessageEditing,
    s.likeMessage,
  ]);
  const { message } = App.useApp();
  const virtuosoRef = use(VirtuosoContext);

  const [showShareModal, setShareModal] = useState(false);
  const [showFeedBackModal, setFeedBackModal] = useState(false);

  const handleFeedBackSubmit = async (feedback: FeedbackOptions) => {
    const feedbackContent = {
      ...feedback,
      traceId: item?.traceId,
    };

    const feedbackContentStr = qs.stringify(feedbackContent, {
      encode: false,
    });

    console.warn('feedbackContent', feedbackContentStr);
    (window as any).yuyanMonitor?.log({
      code: 11,
      msg: '点踩消息',
      d1: `消息id; ${id}`,
      d2: `反馈内容: ${feedbackContentStr}`,
    });
    setFeedBackModal(false);
  };

  const handleActionClick = useCallback(
    async (action: ActionIconGroupEvent) => {
      switch (action.key) {
        case 'edit': {
          toggleMessageEditing(id, true);

          virtuosoRef?.current?.scrollIntoView({
            align: 'start',
            behavior: 'auto',
            index,
          });
        }
      }
      if (!item) return;

      switch (action.key) {
        case 'copy': {
          await copyMessage(id, item.content);
          message.success('复制成功');
          break;
        }

        case 'del': {
          deleteMessage(id);
          break;
        }

        case 'regenerate': {
          regenerateMessage(id);
          // if this message is an error message, we need to delete it
          if (item.error) deleteMessage(id);
          break;
        }

        case 'delAndRegenerate': {
          delAndRegenerateMessage(id);
          break;
        }

        case 'like': {
          const content = qs.stringify({
            traceId: item.traceId,
            sessionId: item.sessionId,
          });
          const res = await likeMessage(id, content);
          if (res.likeAction === 'like') {
            message.success('点赞成功');
          } else if (res.likeAction === 'unknown') {
            message.success('取消点赞成功');
          }
          break;
        }

        case 'notLike': {
          setFeedBackModal(true);
          break;
        }

        // case 'tts': {
        //   ttsMessage(id);
        //   break;
        // }

        // case 'export': {
        //   setModal(true);
        //   break;
        // }

        case 'share': {
          setShareModal(true);
          break;
        }
      }

      // if (action.keyPath.at(-1) === 'translate') {
      //   // click the menu item with translate item, the result is:
      //   // key: 'en-US'
      //   // keyPath: ['en-US','translate']
      //   const lang = action.keyPath[0];
      //   translateMessage(id, lang);
      // }
    },
    [item],
  );

  const RenderFunction = renderActions[(item?.role || '') as MessageRoleType] ?? ActionsBar;

  if (!item) return null;

  return (
    <>
      <RenderFunction {...item} onActionClick={handleActionClick} />
      {/*{showModal && (*/}
      {/*  <ExportPreview content={item.content} onClose={() => setModal(false)} open={showModal} />*/}
      {/*)}*/}
      <ShareMessageModal
        message={item}
        onCancel={() => {
          setShareModal(false);
        }}
        open={showShareModal}
      />
      <FeedBackModal
        visible={showFeedBackModal}
        onClose={() => setFeedBackModal(false)}
        onSubmit={handleFeedBackSubmit}
      />
    </>
  );
});

export default Actions;
