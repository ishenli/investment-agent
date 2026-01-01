import { Popconfirm } from 'antd';
import { Eraser } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

import { useChatStore } from '@renderer/store/chat';

import React from 'react';
import Action from '../components/Action';

export const useClearCurrentMessages = () => {
  const clearMessage = useChatStore((s) => s.clearMessage);
  const clearImageList = () => {
    // TODO: 清空图片列表
  };

  return useCallback(async () => {
    await clearMessage();
    clearImageList();
  }, [clearImageList, clearMessage]);
};

const Clear = memo(() => {
  const clearCurrentMessages = useClearCurrentMessages();
  const [confirmOpened, updateConfirmOpened] = useState(false);

  const actionTitle: any = confirmOpened ? void 0 : '清空当前会话消息';

  const popconfirmPlacement = 'topRight';

  return (
    <Popconfirm
      arrow={false}
      okButtonProps={{ danger: true, type: 'primary' }}
      onConfirm={clearCurrentMessages}
      onOpenChange={updateConfirmOpened}
      open={confirmOpened}
      placement={popconfirmPlacement}
      title={
        <div
          style={{
            marginBottom: '8px',
            whiteSpace: 'pre-line',
            wordBreak: 'break-word',
          }}
        >
          即将清空当前会话消息，清空后将无法找回，请确认你的操作
        </div>
      }
    >
      <Action
        data-aspm-click="c437890.d627180"
        icon={Eraser}
        title={actionTitle}
        tooltipProps={{
          placement: 'bottom',
          styles: {
            root: { maxWidth: 'none' },
          },
        }}
      />
    </Popconfirm>
  );
});

export default Clear;
