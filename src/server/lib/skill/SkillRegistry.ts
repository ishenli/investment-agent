/**
 * SkillRegistry
 *
 * Responsibility: unified runtime skill registry.
 *
 * Merges data from two sources:
 *   1. Filesystem (via SkillFileScanner) — source of truth for skill content/metadata
 *   2. Database (via skillRepository) — source of truth for user-specific enabled state
 *
 * All content (name, description, category, prompt) comes from SKILL.md files.
 * The database only stores user preferences: slug, source, isEnabled, icon.
 *
 * Provides the consumption-side API: getSkills(), getEnabledSkills().
 * Supports in-memory cache invalidation after install/update operations.
 */

import logger from '@server/base/logger';
import { skillRepository } from '../../repository/skillRepository';
import { SkillFileScanner, skillFileScanner } from './SkillFileScanner';
import type {
  ParsedSkill,
  ResolvedSkill,
  SkillSource,
  SkillCategory,
  SkillSearchParams,
  SkillListResponse,
  SkillResponse,
} from '@/types/skill';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toSkillResponse = (skill: ResolvedSkill): SkillResponse => ({
  id: skill.dbId ?? 0,
  slug: skill.id,
  name: skill.name,
  description: skill.description,
  version: skill.version,
  source: skill.source,
  icon: skill.icon ?? null,
  isEnabled: skill.isEnabled,
  isOfficial: skill.isOfficial,
  isBuiltIn: skill.isBuiltIn,
  skillPath: skill.skillPath,
  dbId: skill.dbId,
  // Timestamps: use filesystem mtime
  updatedAt: new Date(skill.updatedAt).toISOString(),
});

// ─── SkillRegistry class ──────────────────────────────────────────────────────

export class SkillRegistry {
  private scanner: SkillFileScanner;
  /** Per-user cache: userId → ResolvedSkill[] */
  private cache = new Map<number, ResolvedSkill[]>();

  constructor(scanner?: SkillFileScanner) {
    this.scanner = scanner ?? skillFileScanner;
  }

  /**
   * Invalidate the in-memory cache (call after installing/removing skills).
   * If userId is provided, only that user's cache is cleared.
   */
  invalidate(userId?: number): void {
    if (userId !== undefined) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  // ── Core merge logic ─────────────────────────────────────────────────────

  /**
   * Build the resolved skill list for a user by merging filesystem data
   * with DB preference records (keyed by slug).
   *
   * All content comes from SKILL.md files; DB only provides user preferences.
   * Skills without a SKILL.md file are not shown.
   */
  async resolve(userId: number): Promise<ResolvedSkill[]> {
    if (this.cache.has(userId)) {
      return this.cache.get(userId)!;
    }

    // 1. Filesystem skills (all users share the same files)
    const parsedSkills = this.scanner.scan();

    // 2. DB preferences for this user (slug → preference)
    const dbPreferences = await skillRepository.findByUserId(userId);
    const prefMap = new Map(dbPreferences.map((p) => [p.slug, p]));

    // 3. Get defaults from skills.config.json
    const defaults = this.scanner.loadSkillsDefaults(this.scanner.getSkillRoots());

    // 4. Merge: filesystem is the authoritative source for content;
    //    DB provides the user's enabled/disabled override and icon.
    const resolved: ResolvedSkill[] = parsedSkills.map((parsed) => {
      const pref = prefMap.get(parsed.id);
      const defaultEnabled = defaults[parsed.id]?.enabled ?? true;
      return {
        ...parsed,
        category: parsed.category ?? 'other',
        dbId: pref?.id,
        isEnabled: pref ? pref.isEnabled : defaultEnabled,
        source: this.resolveSource(parsed, pref?.source ?? null),
        icon: pref?.icon ?? null,
      };
    });

    this.cache.set(userId, resolved);
    return resolved;
  }

  private resolveSource(
    parsed: ParsedSkill,
    dbSource: string | null,
  ): SkillSource {
    // DB preference takes precedence
    if (dbSource === 'official' || dbSource === 'community' || dbSource === 'custom') {
      return dbSource;
    }
    // Fallback to parsed metadata
    if (parsed.isOfficial) return 'official';
    if (parsed.isBuiltIn) return 'official';
    return 'custom';
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Get all skills for a user, applying optional search/filter params.
   * This is the list endpoint used by the management UI.
   */
  async getSkills(userId: number, params: SkillSearchParams = {}): Promise<SkillListResponse> {
    const { search, source, limit = 100, offset = 0 } = params;
    let skills = await this.resolve(userId);

    if (search) {
      const q = search.toLowerCase();
      skills = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q),
      );
    }
    if (source) {
      skills = skills.filter((s) => s.source === source);
    }

    const totalCount = skills.length;
    const paged = skills.slice(offset, offset + limit);

    return {
      skills: paged.map(toSkillResponse),
      totalCount,
    };
  }

  /**
   * Get a single resolved skill by slug.
   */
  async getBySlug(userId: number, slug: string): Promise<ResolvedSkill | null> {
    const skills = await this.resolve(userId);
    return skills.find((s) => s.id === slug) ?? null;
  }

  /**
   * Get enabled skills only — used by the Agent/Chat consumption side.
   * Returns the full ResolvedSkill (including prompt) for LLM context injection.
   */
  async getEnabledSkills(userId: number): Promise<ResolvedSkill[]> {
    const skills = await this.resolve(userId);
    return skills.filter((s) => s.isEnabled);
  }

  /**
   * Get resolved skills by an explicit list of slugs, regardless of their global isEnabled state.
   * Used for session-level skill activation where the user has explicitly chosen skills
   * in the tool panel — bypassing the global on/off toggle.
   */
  async getSkillsBySlugs(userId: number, slugs: string[]): Promise<ResolvedSkill[]> {
    if (slugs.length === 0) return [];
    const skills = await this.resolve(userId);
    const slugSet = new Set(slugs);
    return skills.filter((s) => slugSet.has(s.id));
  }

  /**
   * Toggle a skill's enabled state.
   * Creates a DB preference record if one doesn't exist.
   */
  async toggle(userId: number, slug: string, isEnabled: boolean): Promise<void> {
    const existing = await skillRepository.findByUserIdAndSlug(userId, slug);

    if (existing) {
      await skillRepository.update(userId, existing.id, { isEnabled });
    } else {
      // Determine source from filesystem
      const parsed = this.scanner.scan().find((s) => s.id === slug);
      await skillRepository.create({
        slug,
        source: parsed?.isOfficial ? 'official' : 'custom',
        isEnabled,
        userId,
      });
    }

    this.invalidate(userId);
    logger.info(`[SkillRegistry] Toggled skill "${slug}" → isEnabled=${isEnabled} for user ${userId}`);
  }
}

export const skillRegistry = new SkillRegistry();