/**
 * Reflection types — audit results, learning records, and pipeline configuration.
 */

import type { HermesAgentResult } from '../types';

// ============== Framework ==============

export interface Dimension {
  id: string;
  name: string;
  description: string;
  keywords: string[];
}

export interface FrameworkConfig {
  name: string;
  description: string;
  version: string;
  domainKeywords: string[];
  dimensions: Dimension[];
}

// ============== Audit Result ==============

export interface DimensionAudit {
  dimensionId: string;
  dimensionName: string;
  covered: boolean;
  evidence?: string;
  /** Original framework description copied for skill generation */
  description?: string;
  /** Original framework keywords copied for skill generation */
  keywords?: string[];
}

export interface AuditResult {
  /** Whether the conversation is related to the framework domain */
  domainRelevant: boolean;
  /** Dimensions checked */
  dimensions: DimensionAudit[];
  /** Dimensions marked as covered */
  covered: DimensionAudit[];
  /** Dimensions marked as missing */
  missing: DimensionAudit[];
  /** Raw LLM response for debugging */
  rawResponse?: string;
}

// ============== Skill Generation ==============

export interface SkillDefinition {
  slug: string;
  name: string;
  description: string;
  category: string;
  promptTemplate: string;
  version: string;
}

// ============== Learning Record ==============

export interface LearningRecord {
  id: string;
  timestamp: number;
  turnNumber: number;
  frameworkName: string;
  dimensionsChecked: number;
  dimensionsCovered: string[];
  dimensionsMissing: string[];
  skillsCreated: string[];
  /** Optional error if reflection failed */
  error?: string;
}

// ============== Reflection Options ==============

export interface ReflectionOptions {
  /** Path to the framework JSON file */
  frameworksPath: string;
  /** Maximum tokens for the audit LLM output */
  maxTokens: number;
  /** Local skills directory for deduplication and writing */
  localSkillsDir?: string;
  /** Callback when a skill is created */
  onSkillChanged?: (event: { action: 'create'; slug: string }) => void | Promise<void>;
}

// ============== Utility Types ==============

export type ReflectionPhase =
  | 'detect_domain'
  | 'audit'
  | 'generate_skills'
  | 'record_learnings';

export interface ReflectionRun {
  result: HermesAgentResult;
  auditResult?: AuditResult;
  learnings?: LearningRecord;
  skillsCreated: string[];
}
