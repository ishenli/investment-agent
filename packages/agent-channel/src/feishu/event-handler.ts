import crypto from 'node:crypto';
import type {
  FeishuChannelConfig,
  FeishuChallengeEvent,
  FeishuEventV2,
} from './types';

/**
 * Check if the event is a URL verification challenge
 */
export function isChallengeEvent(event: unknown): event is FeishuChallengeEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    (event as Record<string, unknown>).type === 'url_verification'
  );
}

/**
 * Handle challenge event - return the challenge token for URL verification
 */
export function handleChallenge(event: FeishuChallengeEvent): { challenge: string } {
  return { challenge: event.challenge };
}

/**
 * Check if the event is a v2 event
 */
export function isEventV2(event: unknown): event is FeishuEventV2 {
  return (
    typeof event === 'object' &&
    event !== null &&
    'schema' in event &&
    (event as Record<string, unknown>).schema === '2.0'
  );
}

/**
 * Verify event token matches the configured verification token
 */
export function verifyToken(event: unknown, config: FeishuChannelConfig): boolean {
  // Reject all events when no verification token is configured (secure default)
  if (!config.verificationToken) return false;

  if (isChallengeEvent(event)) {
    return event.token === config.verificationToken;
  }

  if (isEventV2(event)) {
    return event.header.token === config.verificationToken;
  }

  return false;
}

/**
 * Decrypt event body if encryptKey is configured.
 * Feishu encrypts event body with AES-256-CBC.
 */
export function decryptEvent(encrypt: string, encryptKey: string): unknown {
  const key = crypto.createHash('sha256').update(encryptKey).digest();
  const encryptedBuffer = Buffer.from(encrypt, 'base64');
  const iv = encryptedBuffer.subarray(0, 16);
  const encrypted = encryptedBuffer.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

/**
 * Parse incoming event body, handling encryption if needed
 */
export function parseEventBody(body: unknown, config: FeishuChannelConfig): unknown {
  if (
    typeof body === 'object' &&
    body !== null &&
    'encrypt' in body &&
    config.encryptKey
  ) {
    return decryptEvent((body as { encrypt: string }).encrypt, config.encryptKey);
  }
  return body;
}
