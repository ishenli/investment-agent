/** Contract between a messaging channel task and an Agent implementation. */
import type { ChannelMessage } from '@investment-agent/agent-channel';

// ── Reply sender (capability slice of WeixinChannel) ─────────────────────────

/**
 * Minimal interface for sending a reply through the channel.
 * Satisfied by WeixinChannel.sendMessage() — passed to handlers
 * in case they need to stream partial replies in the future.
 */
export interface ChannelReplySender {
  sendMessage(channelId: string, response: { content: string }): Promise<void>;
}

// ── Message context (assembled by the Channel layer) ─────────────────────────

/**
 * Resolved context passed to the agent handler on each inbound message.
 * The Channel layer is responsible for loading history and resolving the user
 * before calling handle(), so handlers do not need to touch the DB directly.
 */
export interface ChannelMessageContext {
  /** Persistent chat session ID (created on first message from this channelId) */
  sessionId: string;
  /** Application user ID owning this channel */
  userId: number;
  /** Recent conversation history, oldest first, excluding the current message */
  history: Array<{ role: string; content: string }>;
}

// ── Agent handler contract ────────────────────────────────────────────────────

/**
 * The single contract between the Weixin Channel layer and any agent implementation.
 *
 * Implementations receive the inbound message, resolved context, and a reply sender.
 * They must return the final reply string; the Channel layer takes care of
 * persisting the assistant message and sending it through the channel.
 *
 * Example implementations:
 *   - HermesChannelHandler  (src/server/channel/hermesChannelHandler.ts)
 *   - LanggraphWeixinHandler  (future)
 */
export interface ChannelAgentHandler {
  /**
   * Process an inbound message and return the reply text.
   *
   * @param message  Raw inbound ChannelMessage from WeixinChannel
   * @param ctx      Resolved session/user/history context
   * @param sender   Capability to send replies (for future streaming use)
   * @returns        Final reply string to send back to the user
   */
  handle(
    message: ChannelMessage,
    ctx: ChannelMessageContext,
    sender: ChannelReplySender,
  ): Promise<string>;
}

// Backward-compatible aliases for the existing Weixin task.
export type WeixinReplySender = ChannelReplySender;
export type WeixinMessageContext = ChannelMessageContext;
export type WeixinAgentHandler = ChannelAgentHandler;
