/**
 * Error classification system for Hermes Agent.
 *
 * Ported from Python hermes-agent's agent/error_classifier.py.
 * Maps API errors to a centralized taxonomy with recovery hints.
 */

export type HermesErrorCode =
  | 'TOOL_EXECUTION_FAILED'
  | 'MAX_ITERATIONS_EXCEEDED'
  | 'CONTEXT_OVERFLOW'
  | 'API_ERROR'
  | 'PROVIDER_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMITED'
  | 'INVALID_RESPONSE'
  | 'TIMEOUT';

export interface ErrorRecoveryHint {
  retryable: boolean;
  shouldCompress: boolean;
  shouldFallback: boolean;
  shouldRotateCredential: boolean;
}

export class HermesAgentError extends Error {
  readonly code: HermesErrorCode;
  readonly retryable: boolean;
  readonly recovery: ErrorRecoveryHint;
  readonly statusCode?: number;
  readonly provider?: string;

  constructor(
    message: string,
    code: HermesErrorCode,
    options?: {
      cause?: Error;
      statusCode?: number;
      provider?: string;
      recovery?: Partial<ErrorRecoveryHint>;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'HermesAgentError';
    this.code = code;

    const defaultRecovery = getDefaultRecovery(code);
    this.recovery = { ...defaultRecovery, ...options?.recovery };
    this.retryable = this.recovery.retryable;
    this.statusCode = options?.statusCode;
    this.provider = options?.provider;
  }
}

function getDefaultRecovery(code: HermesErrorCode): ErrorRecoveryHint {
  switch (code) {
    case 'RATE_LIMITED':
      return { retryable: true, shouldCompress: false, shouldFallback: true, shouldRotateCredential: false };
    case 'CONTEXT_OVERFLOW':
      return { retryable: true, shouldCompress: true, shouldFallback: false, shouldRotateCredential: false };
    case 'AUTH_ERROR':
      return { retryable: false, shouldCompress: false, shouldFallback: true, shouldRotateCredential: true };
    case 'TIMEOUT':
      return { retryable: true, shouldCompress: false, shouldFallback: false, shouldRotateCredential: false };
    case 'PROVIDER_ERROR':
    case 'API_ERROR':
    case 'INVALID_RESPONSE':
      return { retryable: true, shouldCompress: false, shouldFallback: true, shouldRotateCredential: false };
    case 'TOOL_EXECUTION_FAILED':
      return { retryable: false, shouldCompress: false, shouldFallback: false, shouldRotateCredential: false };
    case 'MAX_ITERATIONS_EXCEEDED':
      return { retryable: false, shouldCompress: false, shouldFallback: false, shouldRotateCredential: false };
  }
}

/**
 * Classify an API error into a HermesErrorCode with recovery hints.
 *
 * Priority-ordered pipeline matching the Python implementation:
 *   1. HTTP status code
 *   2. Error message patterns
 *   3. Fallback: unknown retryable error
 */
export function classifyError(
  error: unknown,
  provider?: string,
): HermesAgentError {
  if (error instanceof HermesAgentError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;
  const statusCode = extractStatusCode(error);
  const messageLower = message.toLowerCase();

  // 1. Status code classification
  if (statusCode === 401 || statusCode === 403) {
    return new HermesAgentError(message, 'AUTH_ERROR', {
      cause, statusCode, provider,
    });
  }

  if (statusCode === 429) {
    return new HermesAgentError(message, 'RATE_LIMITED', {
      cause, statusCode, provider,
    });
  }

  if (statusCode === 413 || statusCode === 400) {
    if (messageLower.includes('token') || messageLower.includes('context') || messageLower.includes('too long')) {
      return new HermesAgentError(message, 'CONTEXT_OVERFLOW', {
        cause, statusCode, provider,
      });
    }
  }

  if (statusCode && statusCode >= 500) {
    return new HermesAgentError(message, 'PROVIDER_ERROR', {
      cause, statusCode, provider,
    });
  }

  // 2. Message pattern matching
  if (messageLower.includes('rate limit') || messageLower.includes('too many requests')) {
    return new HermesAgentError(message, 'RATE_LIMITED', {
      cause, provider,
    });
  }

  if (messageLower.includes('context length') || messageLower.includes('maximum context') || messageLower.includes('token limit')) {
    return new HermesAgentError(message, 'CONTEXT_OVERFLOW', {
      cause, provider,
    });
  }

  if (messageLower.includes('timeout') || messageLower.includes('timed out') || messageLower.includes('econnreset') || messageLower.includes('econnrefused')) {
    return new HermesAgentError(message, 'TIMEOUT', {
      cause, provider,
    });
  }

  if (messageLower.includes('unauthorized') || messageLower.includes('invalid api key') || messageLower.includes('authentication')) {
    return new HermesAgentError(message, 'AUTH_ERROR', {
      cause, provider,
    });
  }

  // 3. Fallback: retryable API error
  return new HermesAgentError(message, 'API_ERROR', {
    cause, statusCode, provider,
  });
}

function extractStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    if (typeof e.status === 'number') return e.status;
    if (typeof e.statusCode === 'number') return e.statusCode;
    if (e.response && typeof e.response === 'object') {
      const resp = e.response as Record<string, unknown>;
      if (typeof resp.status === 'number') return resp.status;
    }
  }
  return undefined;
}
