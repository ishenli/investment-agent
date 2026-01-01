import { DEFAULT_AVATAR, DEFAULT_BACKGROUND_COLOR, DEFAULT_INBOX_AVATAR } from '@renderer/const/meta';
import { SessionStore } from '@renderer/store/session';
import { MetaData } from '@typings/meta';
import { merge } from 'lodash';

import { SESSION_CONFIG_DESCRIPTION, SESSION_CONFIG_TITLE } from '@renderer/const/text/sessionConfig';
import { sessionSelectors } from './list';

// ==========   Meta   ============== //
const currentAgentMeta = (s: SessionStore): MetaData => {
  const isInbox = sessionSelectors.isInboxSession(s);

  const defaultMeta = {
    avatar: isInbox ? DEFAULT_INBOX_AVATAR : DEFAULT_AVATAR,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    description: isInbox ? SESSION_CONFIG_DESCRIPTION.INBOX : undefined,
    title: isInbox ? SESSION_CONFIG_TITLE.INBOX : SESSION_CONFIG_TITLE.DEFAULT,
  };

  const session = sessionSelectors.currentSession(s);

  return merge(defaultMeta, session?.meta);
};

const currentAgentTitle = (s: SessionStore) => currentAgentMeta(s).title;
const currentAgentDescription = (s: SessionStore) => currentAgentMeta(s).description;
const currentAgentAvatar = (s: SessionStore) => currentAgentMeta(s).avatar;
const currentAgentBackgroundColor = (s: SessionStore) => currentAgentMeta(s).backgroundColor;

const getAvatar = (s: MetaData) => s.avatar || DEFAULT_AVATAR;
const getTitle = (s: MetaData) => s.title || '自定义助手';
// New session do not show 'noDescription'
export const getDescription = (s: MetaData) => s.description;

export const sessionMetaSelectors = {
  currentAgentAvatar,
  currentAgentBackgroundColor,
  currentAgentDescription,
  currentAgentMeta,
  currentAgentTitle,
  getAvatar,
  getDescription,
  getTitle,
};
