import { DEFAULT_AVATAR } from '@renderer/const/meta';
import { DEFAULT_AGENT_LOBE_SESSION } from '@renderer/const/session';
import { MetaData } from '@typings/meta';
import { LobeAgentSession, LobeSessions } from '@typings/session';

export const getSessionPinned = (session: LobeAgentSession) => session.pinned;

const getAvatar = (s: MetaData) => s.avatar || DEFAULT_AVATAR;
const getTitle = (s: MetaData) => s.title || 'defaultSession';

const getSessionById = (id: string, sessions: LobeSessions): LobeAgentSession => {
  const session = sessions.find((s) => s.id === id);

  if (!session) return DEFAULT_AGENT_LOBE_SESSION;

  return session;
};

export const sessionHelpers = {
  getAvatar,
  getSessionById,
  getSessionPinned,
  getTitle,
};
