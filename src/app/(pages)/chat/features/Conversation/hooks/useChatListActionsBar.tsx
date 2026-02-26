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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('chat');
  
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
        label: t('like'),
      },
      notLike: {
        icon: ThumbsDown,
        key: 'notLike',
        label: t('notLike'),
      },
      share: {
        icon: Share2,
        key: 'share',
        label: t('conversation.share'),
      },
      copy: {
        icon: Copy,
        key: 'copy',
        label: t('copy'),
      },
      del: {
        danger: true,
        disable: hasThread,
        icon: Trash,
        key: 'del',
        label: hasThread ? '存在子话题，不能删除' : t('delete'),
      },
      delAndRegenerate: {
        disable: hasThread,
        icon: ListRestart,
        key: 'delAndRegenerate',
        label: t('deleteAndRegenerate'),
      },
      divider: {
        type: 'divider',
      },
      edit: {
        icon: Edit,
        key: 'edit',
        label: t('edit'),
      },
      export: {
        icon: DownloadIcon,
        key: 'export',
        label: '导出为 PDF',
      },
      regenerate: {
        icon: RotateCcw,
        key: 'regenerate',
        label: t('regenerate'),
      },
    }),
    [hasThread, t],
  );
};
