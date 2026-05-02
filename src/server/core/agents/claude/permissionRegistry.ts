import logger from '@/server/base/logger';
import type { PermissionResult } from '@anthropic-ai/claude-agent-sdk';

/**
 * 权限白名单：这些工具会自动获得批准，无需用户手动授权
 * 适用于内置的、安全的、不涉及敏感操作的工具
 */
const PERMISSION_WHITELIST = new Set<string>([
  // IG 内置工具
  'mcp__ig-tools__noteQueryTool',           // 投资笔记查询
  'mcp__ig-tools__stockGetPriceTool',       // 股票价格查询
  'mcp__ig-tools__stockRecallMarketInfoTool', // 市场信息召回
  'mcp__ig-tools__stockRecallCompanyInfoTool', // 公司信息召回
  'mcp__ig-tools__stockSearchNewsTool',     // 股票新闻搜索
  'mcp__ig-tools__dbQueryTool',             // 数据库查询工具
  'mcp__ig-tools__TravilySearchTool',       // Travily 网络搜索工具
  // 可以根据需要添加更多工具
]);

/**
 * 检查工具是否在白名单中
 */
export function isToolWhitelisted(toolName: string): boolean {
  return PERMISSION_WHITELIST.has(toolName);
}

/**
 * 添加工具到白名单
 */
export function addToWhitelist(toolName: string): void {
  PERMISSION_WHITELIST.add(toolName);
  logger.info(`[permission-registry] Added tool to whitelist: ${toolName}`);
}

/**
 * 从白名单移除工具
 */
export function removeFromWhitelist(toolName: string): void {
  PERMISSION_WHITELIST.delete(toolName);
  logger.info(`[permission-registry] Removed tool from whitelist: ${toolName}`);
}

/**
 * 获取白名单工具列表
 */
export function getWhitelist(): string[] {
  return Array.from(PERMISSION_WHITELIST);
}

interface PendingPermission {
  resolve: (result: PermissionResult) => void;
  createdAt: number;
  abortSignal?: AbortSignal;
  toolInput: Record<string, unknown>;
  timer: ReturnType<typeof setTimeout>;
  toolName?: string; // 用于去重
}

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
// 去重窗口：只要前一个权限请求还在 pending 状态就复用
// 不设置时间限制，因为权限请求本身有 5 分钟超时

// Use globalThis to ensure the Map is shared across all module instances.
// In Next.js dev mode (Turbopack), different API routes may load separate
// module instances, so a module-level variable would NOT be shared.
const globalKey = '__pendingPermissions__' as const;
const dedupKey = '__toolNameToPermissionId__' as const;

function getMap(): Map<string, PendingPermission> {
  if (!(globalThis as Record<string, unknown>)[globalKey]) {
    (globalThis as Record<string, unknown>)[globalKey] = new Map<string, PendingPermission>();
  }
  return (globalThis as Record<string, unknown>)[globalKey] as Map<string, PendingPermission>;
}

function getDedupMap(): Map<string, { permissionId: string; timestamp: number }> {
  if (!(globalThis as Record<string, unknown>)[dedupKey]) {
    (globalThis as Record<string, unknown>)[dedupKey] = new Map<string, { permissionId: string; timestamp: number }>();
  }
  return (globalThis as Record<string, unknown>)[dedupKey] as Map<string, { permissionId: string; timestamp: number }>;
}

/**
 * Helper to deny and remove a pending permission entry.
 */
function denyAndRemove(id: string, message: string) {
  const map = getMap();
  const dedupMap = getDedupMap();
  const entry = map.get(id);
  if (!entry) return;
  clearTimeout(entry.timer);
  entry.resolve({ behavior: 'deny', message });
  map.delete(id);
  
  // 清理去重记录
  if (entry.toolName && dedupMap.get(entry.toolName)?.permissionId === id) {
    dedupMap.delete(entry.toolName);
  }
}

/**
 * Register a pending permission request.
 * Returns a Promise that resolves when the user responds or after TIMEOUT_MS.
 * 
 * 去重逻辑：如果同一个工具已有 pending 状态的权限请求，
 * 将复用该请求，避免重复弹窗。
 */
export function registerPendingPermission(
  id: string,
  toolInput: Record<string, unknown>,
  abortSignal?: AbortSignal,
  toolName?: string,
): Promise<PermissionResult> {
  const map = getMap();
  const dedupMap = getDedupMap();

  // 去重检查：如果同一工具已有 pending 权限请求，复用该请求
  if (toolName) {
    const existing = dedupMap.get(toolName);
    
    if (existing) {
      const existingPermission = map.get(existing.permissionId);
      if (existingPermission) {
        logger.info(
          `[permission-registry] Deduplicating permission request for tool ${toolName}, ` +
          `reusing existing request ${existing.permissionId}`
        );
        
        // 返回已存在的 Promise
        return new Promise<PermissionResult>((resolve) => {
          // 将新的 resolve 也注册到同一个 Promise 链中
          const originalResolve = existingPermission.resolve;
          existingPermission.resolve = (result: PermissionResult) => {
            originalResolve(result);
            resolve(result);
          };
        });
      } else {
        // 清理过期的去重记录
        dedupMap.delete(toolName);
      }
    }
    
    // 记录新的权限请求用于去重
    dedupMap.set(toolName, { permissionId: id, timestamp: Date.now() });
  }

  return new Promise<PermissionResult>((resolve) => {
    // Per-request independent timer: auto-deny after TIMEOUT_MS
    const timer = setTimeout(() => {
      if (map.has(id)) {
        logger.warn(`[permission-registry] Permission request ${id} timed out after ${TIMEOUT_MS / 1000}s`);
        resolve({ behavior: 'deny', message: 'Permission request timed out' });
        map.delete(id);
        // 清理去重记录
        if (toolName && dedupMap.get(toolName)?.permissionId === id) {
          dedupMap.delete(toolName);
        }
      }
    }, TIMEOUT_MS);

    map.set(id, {
      resolve,
      createdAt: Date.now(),
      abortSignal,
      toolInput,
      timer,
      toolName,
    });

    // Auto-deny if the abort signal fires (client disconnect / stop button)
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        denyAndRemove(id, 'Request aborted');
        // 清理去重记录
        if (toolName && dedupMap.get(toolName)?.permissionId === id) {
          dedupMap.delete(toolName);
        }
      }, { once: true });
    }
  });
}

/**
 * Resolve a pending permission request with the user's decision.
 * Returns true if the permission was found and resolved, false otherwise.
 */
export function resolvePendingPermission(
  id: string,
  result: PermissionResult,
): boolean {
  const map = getMap();
  const dedupMap = getDedupMap();
  const entry = map.get(id);
  
  if (!entry) {
    // 权限请求不存在，记录诊断信息
    logger.warn(
      `[permission-registry] Permission request ${id} not found. ` +
      `Current pending requests: ${Array.from(map.keys()).join(', ') || 'none'}`
    );
    return false;
  }

  logger.info(
    `[permission-registry] Resolving permission ${id} with behavior: ${result.behavior}` +
    (entry.toolName ? ` for tool: ${entry.toolName}` : '')
  );

  clearTimeout(entry.timer);

  if (result.behavior === 'allow' && !result.updatedInput) {
    result = { ...result, updatedInput: entry.toolInput };
  }

  entry.resolve(result);
  map.delete(id);
  
  // 清理去重记录
  if (entry.toolName && dedupMap.get(entry.toolName)?.permissionId === id) {
    dedupMap.delete(entry.toolName);
  }
  
  return true;
}
