import { ActionIcon, Dropdown, Icon } from '@lobehub/ui';
import { App } from 'antd';
import { createStyles } from 'antd-style';
import { ItemType } from 'antd/es/menu/interface';
import isEqual from 'fast-deep-equal';
import { Link, MoreVertical, Pin, PinOff, Trash } from 'lucide-react';
import React, { memo, useMemo } from 'react';

import { useSessionStore } from '@renderer/store/session';
import { sessionHelpers } from '@renderer/store/session/helpers';
import { sessionGroupSelectors, sessionSelectors } from '@renderer/store/session/selectors';
import { SessionDefaultGroup } from '@typings/session';

const useStyles = createStyles(({ css }) => ({
  modalRoot: css`
    z-index: 2000;
  `,
}));

interface ActionProps {
  group: string | undefined;
  id: string;
  agentCode: string;
  openCreateGroupModal: () => void;
  setOpen: (open: boolean) => void;
}

const Actions = memo<ActionProps>(({ group, id, agentCode, openCreateGroupModal, setOpen }) => {
  const { styles } = useStyles();

  const sessionCustomGroups = useSessionStore(sessionGroupSelectors.sessionGroupItems, isEqual);
  const [pin, removeSession, pinSession, duplicateSession, updateSessionGroup] = useSessionStore(
    (s) => {
      const session = sessionSelectors.getSessionById(id)(s);
      return [
        sessionHelpers.getSessionPinned(session),
        s.removeSession,
        s.pinSession,
        s.duplicateSession,
        s.updateSessionGroupId,
      ];
    },
  );

  const { modal, message } = App.useApp();

  const isDefault = group === SessionDefaultGroup.Default;
  // const hasDivider = !isDefault || Object.keys(sessionByGroup).length > 0;

  const items = useMemo(
    () =>
      (
        [
          {
            icon: <Icon icon={pin ? PinOff : Pin} />,
            key: 'pin',
            label: pin ? '取消置顶' : '置顶',
            onClick: () => {
              pinSession(id, !pin);
            },
          },
          // {
          //   icon: <Icon icon={LucideCopy} />,
          //   key: 'duplicate',
          //   label: '创建副本',
          //   onClick: ({ domEvent }) => {
          //     domEvent.stopPropagation();

          //     duplicateSession(id);
          //   },
          // },
          // {
          //   type: 'divider',
          // },
          // {
          //   children: [
          //     ...sessionCustomGroups.map(({ id: groupId, name }) => ({
          //       icon: group === groupId ? <Icon icon={Check} /> : <div />,
          //       key: groupId,
          //       label: name,
          //       onClick: () => {
          //         updateSessionGroup(id, groupId);
          //       },
          //     })),
          //     {
          //       icon: isDefault ? <Icon icon={Check} /> : <div />,
          //       key: 'defaultList',
          //       label: '默认分组',
          //       onClick: () => {
          //         updateSessionGroup(id, SessionDefaultGroup.Default);
          //       },
          //     },
          //     {
          //       type: 'divider',
          //     },
          //     {
          //       icon: <Icon icon={LucidePlus} />,
          //       key: 'createGroup',
          //       label: <div>创建分组</div>,
          //       onClick: ({ domEvent }) => {
          //         domEvent.stopPropagation();
          //         openCreateGroupModal();
          //       },
          //     },
          //   ],
          //   icon: <Icon icon={ListTree} />,
          //   key: 'moveGroup',
          //   label: '移动到',
          // },
          // {
          //   type: 'divider',
          // },
          // false
          //   ? undefined
          //   : {
          //       children: [
          //         // {
          //         //   key: 'agent',
          //         //   label: '导出助手',
          //         //   onClick: () => {
          //         //     // configService.exportSingleAgent(id);
          //         //   },
          //         // },
          //         {
          //           key: 'agentWithMessage',
          //           label: '导出助手和消息',
          //           onClick: () => {
          //             // configService.exportSingleSession(id);
          //           },
          //         },
          //       ],
          //       icon: <Icon icon={HardDriveDownload} />,
          //       key: 'export',
          //       label: '导出',
          //     },
          {
            danger: true,
            icon: <Icon icon={Trash} />,
            key: 'delete',
            label: '删除',
            onClick: ({ domEvent }) => {
              domEvent.stopPropagation();
              modal.confirm({
                centered: true,
                okButtonProps: { danger: true },
                onOk: async () => {
                  await removeSession(id);
                  message.success('删除成功');
                },
                rootClassName: styles.modalRoot,
                title: '即将删除该会话，删除后将不可恢复，请谨慎操作。',
              });
            },
          },
        ] as ItemType[]
      ).filter(Boolean),
    [id, pin],
  );

  return (
    <Dropdown
      arrow={false}
      menu={{
        items,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
        },
      }}
      onOpenChange={setOpen}
      trigger={['click']}
    >
      <ActionIcon
        icon={MoreVertical}
        size={{
          blockSize: 28,
          size: 16,
        }}
      />
    </Dropdown>
  );
});

export default Actions;
