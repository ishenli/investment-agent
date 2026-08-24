/**
 * Agent Runtime Asset Service
 *
 * Thin service layer responsible for enumerating, reading, and writing
 * Claude Code and Hermes Agent runtime files (MEMORY.md, USER.md).
 *
 * Security model: the API only accepts (runtime, assetType, assetId).
 * This service maps those logical identifiers to an allowlisted
 * absolute path inside the user's workspace. Path traversal is
 * rejected before any I/O.
 */

import path from 'path';
import fs from 'fs/promises';
import logger from '@server/base/logger';
import { getProjectRoot } from '@server/base/env';
import type {
  AgentRuntime,
  RuntimeAssetType,
  AssetDefinition,
  RuntimeAssetMeta,
  RuntimeAssetListResponse,
  RuntimeAssetDetailResponse,
  RuntimeAssetSaveResponse,
  ResolvedAssetPath,
} from '@typings/agentRuntimeAsset';

const MAX_FILE_SIZE_BYTES = 100 * 1024; // 100 KB

// ─── Asset definitions per runtime ─────────────────────────────────────────

const CLAUDE_ASSETS: AssetDefinition[] = [
  { assetId: 'memory', assetType: 'memory', displayName: 'MEMORY.md', fileName: 'MEMORY.md', readOnly: false },
  { assetId: 'user', assetType: 'user', displayName: 'USER.md', fileName: 'USER.md', readOnly: false },
];

const HERMES_ASSETS: AssetDefinition[] = [
  { assetId: 'memory', assetType: 'memory', displayName: 'MEMORY.md', fileName: 'MEMORY.md', readOnly: false },
  { assetId: 'user', assetType: 'user', displayName: 'USER.md', fileName: 'USER.md', readOnly: false },
];

const ASSET_REGISTRY: Record<AgentRuntime, AssetDefinition[]> = {
  claude: CLAUDE_ASSETS,
  hermes: HERMES_ASSETS,
};

// ─── Path resolvers ────────────────────────────────────────────────────────

function getClaudeRuntimeRoot(userId: number): string {
  return path.join(getProjectRoot(), 'workspace', String(userId));
}

function getHermesMemoryRoot(userId: number): string {
  return path.join(getProjectRoot(), 'workspace', String(userId), '.hermes', 'memories');
}

function getRuntimeRoot(runtime: AgentRuntime, userId: number): string {
  switch (runtime) {
    case 'claude':
      return getClaudeRuntimeRoot(userId);
    case 'hermes':
      return getHermesMemoryRoot(userId);
  }
}

// ─── Service ───────────────────────────────────────────────────────────────

export class AgentRuntimeAssetService {
  /**
   * Resolve a logical asset identifier to an absolute filesystem path.
   * Returns null if the (runtime, assetId) combination is unknown.
   * Rejects path traversal attempts.
   */
  resolve(runtime: AgentRuntime, assetId: string, userId: number): ResolvedAssetPath | null {
    const definitions = ASSET_REGISTRY[runtime];
    if (!definitions) return null;

    const def = definitions.find((d) => d.assetId === assetId);
    if (!def) return null;

    if (assetId.includes('..') || assetId.includes('/') || assetId.includes('\\')) {
      logger.warn(`[AgentRuntimeAssetService] Path traversal rejected: ${assetId}`);
      return null;
    }

    const root = getRuntimeRoot(runtime, userId);
    const absolutePath = path.join(/*turbopackIgnore: true*/ root, def.fileName);

    if (!absolutePath.startsWith(root)) {
      logger.warn(`[AgentRuntimeAssetService] Resolved path escapes root: ${absolutePath}`);
      return null;
    }

    return { absolutePath, readOnly: def.readOnly };
  }

  /**
   * List all runtime assets for a given runtime, with metadata.
   * Optionally filter by assetType.
   */
  async listAssets(
    userId: number,
    runtime: AgentRuntime,
    assetType?: RuntimeAssetType,
  ): Promise<RuntimeAssetListResponse> {
    let definitions = ASSET_REGISTRY[runtime] ?? [];
    if (assetType) {
      definitions = definitions.filter((d) => d.assetType === assetType);
    }

    const assets: RuntimeAssetMeta[] = await Promise.all(
      definitions.map((def) => this.buildMeta(runtime, def, userId)),
    );

    return { runtime, assets };
  }

  /**
   * List assets for all runtimes.
   */
  async listAllAssets(
    userId: number,
    assetType?: RuntimeAssetType,
  ): Promise<RuntimeAssetListResponse[]> {
    const runtimes: AgentRuntime[] = ['claude', 'hermes'];
    return Promise.all(runtimes.map((r) => this.listAssets(userId, r, assetType)));
  }

  /**
   * Read the content of a specific runtime asset.
   */
  async getAsset(
    userId: number,
    runtime: AgentRuntime,
    assetId: string,
  ): Promise<RuntimeAssetDetailResponse | null> {
    const resolved = this.resolve(runtime, assetId, userId);
    if (!resolved) return null;

    const def = ASSET_REGISTRY[runtime]?.find((d) => d.assetId === assetId);
    if (!def) return null;

    const meta = await this.buildMeta(runtime, def, userId);
    let content = '';

    if (meta.exists) {
      try {
        content = await fs.readFile(resolved.absolutePath, 'utf-8');
      } catch (error) {
        logger.error(`[AgentRuntimeAssetService] Failed to read ${resolved.absolutePath}:`, error);
        content = '';
      }
    }

    return { meta, content };
  }

  /**
   * Save content to a runtime asset file.
   * Uses atomic write (write to temp file then rename).
   */
  async saveAsset(
    userId: number,
    runtime: AgentRuntime,
    assetId: string,
    content: string,
  ): Promise<RuntimeAssetSaveResponse> {
    const resolved = this.resolve(runtime, assetId, userId);
    if (!resolved) {
      throw new Error(`Unknown asset: ${runtime}/${assetId}`);
    }

    if (resolved.readOnly) {
      throw new Error(`Asset ${runtime}/${assetId} is read-only`);
    }

    // UTF-8 validation: content is already a JS string, so it's valid UTF-16.
    // We check the byte length for size limit.
    const byteLength = Buffer.byteLength(content, 'utf-8');
    if (byteLength > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Content exceeds maximum size (${byteLength} bytes > ${MAX_FILE_SIZE_BYTES} bytes)`,
      );
    }

    // Ensure parent directory exists
    const dir = path.dirname(resolved.absolutePath);
    await fs.mkdir(dir, { recursive: true });

    // Atomic write: write temp file then rename
    const tmpPath = `${resolved.absolutePath}.tmp.${Date.now()}`;
    try {
      await fs.writeFile(tmpPath, content, 'utf-8');
      await fs.rename(tmpPath, resolved.absolutePath);
    } catch (error) {
      // Clean up temp file on failure
      try {
        await fs.unlink(tmpPath);
      } catch {
        // ignore cleanup error
      }
      throw error;
    }

    logger.info(
      `[AgentRuntimeAssetService] Saved ${runtime}/${assetId} for user ${userId} (${byteLength} bytes)`,
    );

    const def = ASSET_REGISTRY[runtime]!.find((d) => d.assetId === assetId)!;
    const meta = await this.buildMeta(runtime, def, userId);

    return { meta, content };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async buildMeta(
    runtime: AgentRuntime,
    def: AssetDefinition,
    userId: number,
  ): Promise<RuntimeAssetMeta> {
    const resolved = this.resolve(runtime, def.assetId, userId);
    if (!resolved) {
      return {
        assetId: def.assetId,
        runtime,
        assetType: def.assetType,
        displayName: def.displayName,
        exists: false,
        readOnly: def.readOnly,
        updatedAt: null,
        sizeBytes: null,
      };
    }

    try {
      const stat = await fs.stat(resolved.absolutePath);
      return {
        assetId: def.assetId,
        runtime,
        assetType: def.assetType,
        displayName: def.displayName,
        exists: true,
        readOnly: resolved.readOnly,
        updatedAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
      };
    } catch {
      return {
        assetId: def.assetId,
        runtime,
        assetType: def.assetType,
        displayName: def.displayName,
        exists: false,
        readOnly: resolved.readOnly,
        updatedAt: null,
        sizeBytes: null,
      };
    }
  }
}

export const agentRuntimeAssetService = new AgentRuntimeAssetService();
