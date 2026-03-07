/**
 * SkillManager — backward-compatibility façade
 *
 * This file is kept so that any existing code that imports from
 * '@server/lib/skillManager' continues to work without modification.
 *
 * All real implementation has been moved to the dedicated classes in
 * src/server/lib/skill/:
 *   - SkillFileScanner  — filesystem discovery & SKILL.md parsing
 *   - SkillInstaller    — download & install from GitHub/ZIP/local
 *   - SkillRegistry     — unified runtime registry (merge fs + DB state)
 *
 * New code should import directly from '@server/lib/skill' instead.
 *
 * @deprecated Use the new skill sub-modules directly.
 */

import { SkillFileScanner, skillFileScanner } from './skill/SkillFileScanner';
import { SkillInstaller } from './skill/SkillInstaller';
import type { ParsedSkill, InstallResult } from '@/types/skill';

// Re-export types that downstream code may reference
export type { SkillDefaultConfig, SkillsConfig } from './skill/SkillFileScanner';

/**
 * @deprecated Kept for API compatibility. Use skillRegistry from '@server/lib/skill' instead.
 */
export type SkillStateMap = Record<string | number, { enabled: boolean }>;

/**
 * SkillManager
 *
 * Thin façade that delegates to SkillFileScanner and SkillInstaller.
 * Methods that accepted a SkillStateMap now read state from the database
 * through SkillRegistry — the stateMap parameter is ignored.
 *
 * @deprecated New features should use SkillFileScanner / SkillInstaller / SkillRegistry directly.
 */
export class SkillManager {
  private scanner: SkillFileScanner;
  private installer: SkillInstaller;

  constructor() {
    this.scanner = skillFileScanner;
    this.installer = new SkillInstaller(this.scanner);
  }

  // ── Path helpers (delegated to scanner) ─────────────────────────────────

  getSkillsRoot(): string {
    return this.scanner.getSkillsRoot();
  }

  ensureSkillsRoot(): string {
    return this.scanner.ensureSkillsRoot();
  }

  getBundledSkillsRoot(): string {
    return this.scanner.getBundledSkillsRoot();
  }

  getSkillRoots(primaryRoot?: string): string[] {
    return this.scanner.getSkillRoots(primaryRoot);
  }

  listBuiltInSkillIds(): Set<string> {
    return this.scanner.listBuiltInSkillIds();
  }

  getSkillVersion(skillDir: string): string {
    return this.scanner.getSkillVersion(skillDir);
  }

  // ── Skill listing ────────────────────────────────────────────────────────

  /**
   * @deprecated The stateMap parameter is ignored. Use SkillRegistry.getSkills() instead.
   */
  listSkills(_state: SkillStateMap = {}): ParsedSkill[] {
    return this.scanner.scan();
  }

  // ── Config loading ───────────────────────────────────────────────────────

  loadSkillsDefaults(roots: string[]): Record<string, { order?: number; enabled?: boolean }> {
    return this.scanner.loadSkillsDefaults(roots);
  }

  // ── Download / Install ───────────────────────────────────────────────────

  /**
   * @deprecated Use SkillInstaller.install() / SkillService.installSkill() instead.
   */
  async downloadSkill(
    source: string,
  ): Promise<{ success: boolean; skills?: ParsedSkill[]; error?: string }> {
    const result: InstallResult = await this.installer.install(source);
    return {
      success: result.success,
      error: result.error,
    };
  }

  // ── Bundled sync ─────────────────────────────────────────────────────────

  syncBundledSkillsToUserData(): void {
    this.installer.syncBundledToUserData();
  }

  // ── File watching (no-ops — watching is now handled at app level if needed) ──

  startWatching(): void {
    // No-op: file watching has been removed from the skill infrastructure layer.
    // If file-watch-based invalidation is needed, integrate at the app startup level.
  }

  stopWatching(): void {
    // No-op.
  }
}

// ─── Singleton (mirrors old export pattern) ──────────────────────────────────

let _skillManager: SkillManager | null = null;

export const getSkillManager = (): SkillManager => {
  if (!_skillManager) {
    _skillManager = new SkillManager();
  }
  return _skillManager;
};
