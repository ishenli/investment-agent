import { ActionIcon, Dropdown, type DropdownProps, Icon, type MenuProps } from '@lobehub/ui';
import { App } from 'antd';
import { createStyles } from 'antd-style';
import { MoreVertical, PencilLine, Plus, Settings2, Trash } from 'lucide-react';
import React, { memo, useMemo } from 'react';

import { useSessionStore } from '@renderer/store/session';

const useStyles = createStyles(({ css }) => ({
  modalRoot: css`
    z-index: 2000;
  `,
}));
interface ActionsProps extends Pick<DropdownProps, 'onOpenChange'> {
  id?: string;
  isCustomGroup?: boolean;
  isPinned?: boolean;
  openConfigModal: () => void;
  openRenameModal?: () => void;
}

type ItemOfType<T> = T extends (infer Item)[] ? Item : never;
type MenuItemType = ItemOfType<MenuProps['items']>;

const Actions = memo<ActionsProps>(
  ({ id, openRenameModal, openConfigModal, onOpenChange, isCustomGroup, isPinned }) => {
    const { styles } = useStyles();
    const { modal, message } = App.useApp();

    const [createSession, removeSessionGroup] = useSessionStore((s) => [
      s.createSession,
      s.removeSessionGroup,
    ]);

    const sessionGroupConfigPublicItem: MenuItemType = {
      icon: <Icon icon={Settings2} />,
      key: 'config',
      label: 'sessionGroup.config',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        openConfigModal();
      },
    };

    const newAgentPublicItem: MenuItemType = {
      icon: <Icon icon={Plus} />,
      key: 'newAgent',
      label: 'newAgent',
      onClick: async ({ domEvent }) => {
        domEvent.stopPropagation();
        const key = 'createNewAgentInGroup';
        message.loading({
          content: 'sessionGroup.creatingAgent',
          duration: 0,
          key,
        });

        await createSession({ group: id, pinned: isPinned });

        message.destroy(key);
        message.success({ content: 'sessionGroup.createAgentSuccess' });
      },
    };

    const customGroupItems: MenuProps['items'] = useMemo(
      () => [
        {
          icon: <Icon icon={PencilLine} />,
          key: 'rename',
          label: 'sessionGroup.rename',
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
            openRenameModal?.();
          },
        },
        sessionGroupConfigPublicItem,
        {
          type: 'divider',
        },
        {
          danger: true,
          icon: <Icon icon={Trash} />,
          key: 'delete',
          label: 'delete',
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
            modal.confirm({
              centered: true,
              okButtonProps: { danger: true },
              onOk: async () => {
                if (!id) return;
                await removeSessionGroup(id);
              },
              rootClassName: styles.modalRoot,
              title: 'sessionGroup.confirmRemoveGroupAlert',
            });
          },
        },
      ],
      [],
    );

    const defaultItems: MenuProps['items'] = useMemo(() => [sessionGroupConfigPublicItem], []);

    const tailItems = useMemo(
      () => (isCustomGroup ? customGroupItems : defaultItems),
      [isCustomGroup, customGroupItems, defaultItems],
    );

    return (
      <Dropdown
        arrow={false}
        menu={{
          items: [newAgentPublicItem, { type: 'divider' }, ...tailItems],
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
          },
        }}
        onOpenChange={onOpenChange}
        trigger={['click']}
      >
        <ActionIcon
          active={false}
          icon={MoreVertical}
          onClick={(e) => {
            e.stopPropagation();
          }}
          size={{ blockSize: 22, size: 16 }}
          style={{ background: '', marginRight: -8 }}
        />
      </Dropdown>
    );
  },
);

export default Actions;
