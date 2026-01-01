import React, { memo, useMemo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import { shallow } from 'zustand/shallow';

import { useAgentStore } from '@renderer/store/agent';
import { agentSelectors } from '@renderer/store/agent/selectors';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';
import { useSessionStore } from '@renderer/store/session';
import { sessionHelpers } from '@renderer/store/session/helpers';
import { sessionMetaSelectors, sessionSelectors } from '@renderer/store/session/selectors';

import ListItem from '../../ListItem';
import CreateGroupModal from '../../Modals/CreateGroupModal';
import Actions from './Actions';

interface SessionItemProps {
  id: string;
  agentCode: string;
}

const SessionItem = memo<SessionItemProps>(({ id, agentCode }) => {
  const [open, setOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [defaultModel] = useAgentStore((s) => [agentSelectors.inboxAgentModel(s)]);

  const [active] = useSessionStore((s) => [s.activeId === id]);
  const [loading] = useChatStore((s) => [chatSelectors.isAIGenerating(s) && id === s.activeId]);

  const [pin, title, description, avatar, avatarBackground, updateAt, model, group] =
    useSessionStore((s) => {
      const session = sessionSelectors.getSessionById(id)(s);
      const meta = session.meta;

      return [
        sessionHelpers.getSessionPinned(session),
        sessionMetaSelectors.getTitle(meta),
        sessionMetaSelectors.getDescription(meta),
        sessionMetaSelectors.getAvatar(meta),
        meta.backgroundColor,
        session?.updatedAt,
        session.model,
        session?.group,
      ];
    });

  // const showModel = model !== defaultModel;
  const showModel = false;

  const actions = useMemo(
    () => (
      <Actions
        group={group}
        id={id}
        agentCode={agentCode}
        openCreateGroupModal={() => setCreateGroupModalOpen(true)}
        setOpen={setOpen}
      />
    ),
    [group, id],
  );

  const addon = useMemo(
    () =>
      !showModel ? undefined : (
        <Flexbox gap={4} horizontal style={{ flexWrap: 'wrap' }}>
          {model}
        </Flexbox>
      ),
    [showModel, model],
  );

  return (
    <>
      <ListItem
        actions={actions}
        active={active}
        addon={addon}
        avatar={avatar}
        avatarBackground={avatarBackground}
        date={updateAt?.valueOf()}
        description={description}
        key={id}
        loading={loading}
        pin={pin}
        showAction={open}
        styles={{
          container: {
            gap: 12,
          },
          content: {
            gap: 6,
            maskImage: `linear-gradient(90deg, #000 90%, transparent)`,
          },
        }}
        title={title}
      />
      <CreateGroupModal
        id={id}
        onCancel={() => setCreateGroupModalOpen(false)}
        open={createGroupModalOpen}
      />
    </>
  );
}, shallow);

export default SessionItem;
