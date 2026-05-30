/**
 * Agent Runtime Asset Types
 *
 * Types for the Agent Runtime Assets Settings feature.
 * Runtime assets are files (Memory, User profile, Skills) used by
 * Claude Code and Hermes Agent at runtime.
 *
 * The API never exposes raw filesystem paths from client input —
 * assets are identified by runtime + assetType + assetId, and the
 * server resolves them to allowlisted locations.
 */

// ============== Enums ==============

export type AgentRuntime = 'claude' | 'hermes';

export type RuntimeAssetType = 'memory' | 'user' | 'skill';

// ============== Asset Metadata ==============

export interface RuntimeAssetMeta {
  assetId: string;
  runtime: AgentRuntime;
  assetType: RuntimeAssetType;
  displayName: string;
  exists: boolean;
  readOnly: boolean;
  updatedAt: string | null;
  sizeBytes: number | null;
}

// ============== API Response Types ==============

export interface RuntimeAssetListResponse {
  runtime: AgentRuntime;
  assets: RuntimeAssetMeta[];
}

export interface RuntimeAssetDetailResponse {
  meta: RuntimeAssetMeta;
  content: string;
}

export interface RuntimeAssetSaveResponse {
  meta: RuntimeAssetMeta;
  content: string;
}

// ============== API Request Types ==============

export interface RuntimeAssetQuery {
  runtime?: AgentRuntime;
  assetType?: RuntimeAssetType;
  assetId?: string;
}

export interface RuntimeAssetSaveRequest {
  runtime: AgentRuntime;
  assetType: RuntimeAssetType;
  assetId: string;
  content: string;
}

// ============== Internal Resolver Types ==============

export interface ResolvedAssetPath {
  absolutePath: string;
  readOnly: boolean;
}

export interface AssetDefinition {
  assetId: string;
  assetType: RuntimeAssetType;
  displayName: string;
  fileName: string;
  readOnly: boolean;
}
