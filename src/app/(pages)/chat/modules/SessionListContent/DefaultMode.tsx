import { CollapseProps } from 'antd';
import isEqual from 'fast-deep-equal';
import React, { memo, useMemo, useState } from 'react';

import { useFetchSessions } from '@renderer/hooks/useFetchSessions';
import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';
import { SessionDefaultGroup } from '@typings/session';

import CollapseGroup from './CollapseGroup';
import Actions from './CollapseGroup/Actions';
import Inbox from './Inbox';
import SessionList from './List';
import ConfigGroupModal from './Modals/ConfigGroupModal';
import RenameGroupModal from './Modals/RenameGroupModal';

const DefaultMode = memo(() => {
  const [activeGroupId, setActiveGroupId] = useState<string>();
  const [renameGroupModalOpen, setRenameGroupModalOpen] = useState(false);
  const [configGroupModalOpen, setConfigGroupModalOpen] = useState(false);

  useFetchSessions();

  const defaultSessions = useSessionStore(sessionSelectors.defaultSessions, isEqual);
  const customSessionGroups = useSessionStore(sessionSelectors.customSessionGroups, isEqual);
  const pinnedSessions = useSessionStore(sessionSelectors.pinnedSessions, isEqual);

  // console.info('defaultSessions', defaultSessions);
  // console.info('customSessionGroups', customSessionGroups);
  // console.info('pinnedSessions', pinnedSessions);

  const [sessionGroupKeys, updateSystemStatus] = useGlobalStore((s) => [
    systemStatusSelectors.sessionGroupKeys(s),
    s.updateSystemStatus,
  ]);

  const items = useMemo(
    () =>
      [
        pinnedSessions &&
          pinnedSessions.length > 0 && {
            children: <SessionList dataSource={pinnedSessions} />,
            // extra: (
            //   <Actions
            //     isPinned
            //     openConfigModal={() => setConfigGroupModalOpen(true)}
            //   />
            // ),
            key: SessionDefaultGroup.Pinned,
            label: '置顶',
          },
        ...(customSessionGroups || []).map(({ id, name, children }) => ({
          children: <SessionList dataSource={children} groupId={id} />,
          extra: (
            <Actions
              id={id}
              isCustomGroup
              onOpenChange={(isOpen) => {
                if (isOpen) setActiveGroupId(id);
              }}
              openConfigModal={() => setConfigGroupModalOpen(true)}
              openRenameModal={() => setRenameGroupModalOpen(true)}
            />
          ),
          key: id,
          label: name,
        })),
        {
          children: <SessionList dataSource={defaultSessions || []} />,
          // extra: (
          //   <Actions openConfigModal={() => setConfigGroupModalOpen(true)} />
          // ),
          key: SessionDefaultGroup.Default,
          label: '专业助手列表',
        },
      ].filter(Boolean) as CollapseProps['items'],
    [customSessionGroups, pinnedSessions, defaultSessions],
  );

  return (
    <>
      <Inbox />
      <CollapseGroup
        activeKey={sessionGroupKeys as any}
        items={items}
        onChange={(keys) => {
          const expandSessionGroupKeys = typeof keys === 'string' ? [keys] : keys;

          updateSystemStatus({ expandSessionGroupKeys });
        }}
      />
      {activeGroupId && (
        <RenameGroupModal
          id={activeGroupId}
          onCancel={() => setRenameGroupModalOpen(false)}
          open={renameGroupModalOpen}
        />
      )}
      <ConfigGroupModal
        onCancel={() => setConfigGroupModalOpen(false)}
        open={configGroupModalOpen}
      />
    </>
  );
});

DefaultMode.displayName = 'SessionDefaultMode';

export default DefaultMode;
