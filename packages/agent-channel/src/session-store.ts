import type { ChannelSession, SessionStore } from './types';

/**
 * In-memory session store - suitable for development and single-instance deployments.
 * For production multi-instance setups, implement SessionStore with Redis/DB backing.
 */
export class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, ChannelSession>();

  async get(channelId: string): Promise<ChannelSession | null> {
    return this.sessions.get(channelId) ?? null;
  }

  async set(channelId: string, session: ChannelSession): Promise<void> {
    this.sessions.set(channelId, session);
  }

  async delete(channelId: string): Promise<void> {
    this.sessions.delete(channelId);
  }
}
