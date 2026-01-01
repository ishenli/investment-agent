import Link from 'next/link';
import React, { memo } from 'react';

import { DEFAULT_BACKGROUND_COLOR, DEFAULT_INBOX_AVATAR } from '@renderer/const/meta';
import { INBOX_SESSION_CONFIG, INBOX_SESSION_ID } from '@renderer/const/session';
import { SESSION_CHAT_URL } from '@renderer/const/url';
import { useSwitchSession } from '@renderer/hooks/useSwitchSession';
import { getChatStoreState, useChatStore } from '@renderer/store/chat';
import { chatSelectors } from '@renderer/store/chat/selectors';
import { useSessionStore } from '@renderer/store/session';

import ListItem from '../ListItem';

const Inbox = memo(() => {
  const activeId = useSessionStore((s) => s.activeId);

  const openNewTopicOrSaveTopic = useChatStore((s) => s.openNewTopicOrSaveTopic);
  const switchSession = useSwitchSession();
  return (
    <Link
      href={SESSION_CHAT_URL(INBOX_SESSION_ID)}
      onClick={async () => {
        if (activeId === INBOX_SESSION_ID) {
          // If user tap the inbox again, open a new topic.
          // Only for desktop.
          const inboxMessages = chatSelectors.inboxActiveTopicMessages(getChatStoreState());

          if (inboxMessages.length > 0) {
            await openNewTopicOrSaveTopic();
          }
        } else {
          switchSession(INBOX_SESSION_ID);
        }
      }}
    >
      <ListItem
        data-aspm-click="c437898.d627179"
        active={activeId === INBOX_SESSION_ID}
        avatar={DEFAULT_INBOX_AVATAR}
        key={INBOX_SESSION_ID}
        avatarBackground={DEFAULT_BACKGROUND_COLOR}
        styles={{
          container: {
            gap: 12,
          },
          content: {
            gap: 6,
            maskImage: `linear-gradient(90deg, #000 90%, transparent)`,
          },
        }}
        title={INBOX_SESSION_CONFIG.title}
        description={INBOX_SESSION_CONFIG.description}
      />
    </Link>
  );
});

export default Inbox;
