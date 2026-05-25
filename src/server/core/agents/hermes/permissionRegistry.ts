import logger from '@/server/base/logger';

type PermissionDecision = 'allow' | 'deny';

interface PendingPermission {
  resolve: (decision: PermissionDecision) => void;
  createdAt: number;
  toolName: string;
  timer: ReturnType<typeof setTimeout>;
}

const TIMEOUT_MS = 30 * 1000; // 30 seconds

const GLOBAL_KEY = '__hermesPendingPermissions__' as const;

function getMap(): Map<string, PendingPermission> {
  if (!(globalThis as Record<string, unknown>)[GLOBAL_KEY]) {
    (globalThis as Record<string, unknown>)[GLOBAL_KEY] = new Map<string, PendingPermission>();
  }
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY] as Map<string, PendingPermission>;
}

export function registerHermesPermission(
  id: string,
  toolName: string,
  abortSignal?: AbortSignal,
): Promise<PermissionDecision> {
  const map = getMap();

  return new Promise<PermissionDecision>((resolve) => {
    const timer = setTimeout(() => {
      if (map.has(id)) {
        logger.warn(`[hermes-permission] Request ${id} timed out after ${TIMEOUT_MS / 1000}s`);
        resolve('deny');
        map.delete(id);
      }
    }, TIMEOUT_MS);

    map.set(id, { resolve, createdAt: Date.now(), toolName, timer });

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        const entry = map.get(id);
        if (entry) {
          clearTimeout(entry.timer);
          entry.resolve('deny');
          map.delete(id);
        }
      }, { once: true });
    }
  });
}

export function resolveHermesPermission(id: string, decision: PermissionDecision): boolean {
  const map = getMap();
  const entry = map.get(id);

  if (!entry) {
    return false;
  }

  logger.info(`[hermes-permission] Resolving ${id} with: ${decision} (tool: ${entry.toolName})`);
  clearTimeout(entry.timer);
  entry.resolve(decision);
  map.delete(id);
  return true;
}
