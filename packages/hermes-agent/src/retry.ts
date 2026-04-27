/**
 * Retry utilities for Hermes Agent.
 *
 * Ported from Python hermes-agent's agent/retry_utils.py.
 * Decorrelated jittered exponential backoff to prevent thundering-herd spikes.
 */

import { HermesAgentError, classifyError } from './error';

/**
 * Calculate a jittered backoff delay.
 *
 * Uses decorrelated jitter so multiple sessions don't retry at the same instant.
 */
export function jitteredBackoff(
  attempt: number,
  baseDelay: number = 5.0,
  maxDelay: number = 120.0,
  jitterRatio: number = 0.5,
): number {
  const exponent = Math.max(0, attempt - 1);
  const delay = Math.min(baseDelay * 2 ** exponent, maxDelay);
  const jitter = Math.random() * jitterRatio * delay;
  return delay + jitter;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  /** Only retry errors matching this predicate. Defaults to retryable errors. */
  shouldRetry?: (error: HermesAgentError) => boolean;
  /** Called before each retry with the error and attempt number. */
  onRetry?: (error: HermesAgentError, attempt: number, delay: number) => void;
}

/**
 * Wrap an async function with retry logic and jittered backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 5.0,
    maxDelay = 120.0,
    shouldRetry = (e) => e.retryable,
    onRetry,
  } = options;

  let lastError: HermesAgentError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (raw) {
      const error = classifyError(raw);
      lastError = error;

      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = jitteredBackoff(attempt + 1, baseDelay, maxDelay);
      onRetry?.(error, attempt + 1, delay);

      await sleep(delay * 1000);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
