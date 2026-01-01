import type { ActionIconGroupItemType } from '@lobehub/ui';
import {
  Copy,
  DownloadIcon,
  Edit,
  ListRestart,
  RotateCcw,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from 'lucide-react';
import { useMemo } from 'react';

interface ChatListActionsBar {
  branching?: ActionIconGroupItemType;
  copy: ActionIconGroupItemType;
  del: ActionIconGroupItemType;
  delAndRegenerate: ActionIconGroupItemType;
  divider: { type: 'divider' };
  edit: ActionIconGroupItemType;
  export: ActionIconGroupItemType;
  regenerate: ActionIconGroupItemType;
  share: ActionIconGroupItemType;
  notLike: ActionIconGroupItemType;
  like: ActionIconGroupItemType;
}

export const useChatListActionsBar = ({
  hasThread,
}: { hasThread?: boolean } = {}): ChatListActionsBar => {
  return useMemo(
    () => ({
      // branching: {
      //   disable: false,
      //   icon: Split,
      //   key: 'branching',
      //   label: !false
      //     ? '创建子话题'
      //     : '「子话题」功能在当前模式下不可用'
      // },
      like: {
        icon: ThumbsUp,
        key: 'like',
        label: '点赞',
      },
      notLike: {
        icon: ThumbsDown,
        key: 'notLike',
        label: '点踩',
      },
      share: {
        icon: Share2,
        key: 'share',
        label: '分享',
      },
      copy: {
        icon: Copy,
        key: 'copy',
        label: '复制',
      },
      del: {
        danger: true,
        disable: hasThread,
        icon: Trash,
        key: 'del',
        label: hasThread ? '存在子话题，不能删除' : '删除',
      },
      delAndRegenerate: {
        disable: hasThread,
        icon: ListRestart,
        key: 'delAndRegenerate',
        label: '删除并重新生成',
      },
      divider: {
        type: 'divider',
      },
      edit: {
        icon: Edit,
        key: 'edit',
        label: '编辑',
      },
      export: {
        icon: DownloadIcon,
        key: 'export',
        label: '导出为 PDF',
      },
      regenerate: {
        icon: RotateCcw,
        key: 'regenerate',
        label: '重新生成',
      },
    }),
    [hasThread],
  );
};
