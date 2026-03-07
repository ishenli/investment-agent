/**
 * SkillRegistry
 *
 * Responsibility: unified runtime skill registry.
 *
 * Merges data from two sources:
 *   1. Filesystem (via SkillFileScanner) — source of truth for skill content/metadata
 *   2. Database (via skillRepository) — source of truth for user-specific enabled state
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
  category: skill.category,
  source: skill.source,
  icon: skill.icon ?? null,
  isEnabled: skill.isEnabled,
  isOfficial: skill.isOfficial,
  isBuiltIn: skill.isBuiltIn,
  skillPath: skill.skillPath,
  version: skill.version,
  dbId: skill.dbId,
  // Timestamps: use filesystem mtime for file-based skills; DB record falls back to now
  createdAt: new Date(skill.updatedAt).toISOString(),
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

    // 3. Merge: filesystem is the authoritative source for content;
    //    DB provides the user's enabled/disabled override.
    const defaults = this.scanner.loadSkillsDefaults(this.scanner.getSkillRoots());

    const resolved: ResolvedSkill[] = parsedSkills.map((parsed) => {
      const pref = prefMap.get(parsed.id);
      const defaultEnabled = defaults[parsed.id]?.enabled ?? true;
      return {
        ...parsed,
        dbId: pref?.id,
        isEnabled: pref ? pref.isEnabled : defaultEnabled,
        source: this.resolveSource(parsed, pref?.source ?? null),
        category: (pref?.category as SkillCategory | undefined) ?? 'other',
        icon: pref?.icon ?? null,
      };
    });

    // 4. Also include pure custom skills that exist in DB but not on filesystem
    for (const pref of dbPreferences) {
      if (!parsedSkills.find((p) => p.id === pref.slug) && pref.source === 'custom') {
        // Custom skill has no SKILL.md; reconstruct from DB record
        const customSkill: ResolvedSkill = {
          id: pref.slug,
          name: pref.name,
          description: pref.description,
          prompt: (pref.config as Record<string, unknown> | null)?.prompt as string ?? '',
          isOfficial: false,
          isBuiltIn: false,
          updatedAt: pref.updatedAt?.getTime() ?? Date.now(),
          skillPath: '',
          version: undefined,
          dbId: pref.id,
          isEnabled: pref.isEnabled,
          source: 'custom',
          category: pref.category as SkillCategory ?? 'other',
          icon: pref.icon ?? null,
        };
        resolved.push(customSkill);
      }
    }

    this.cache.set(userId, resolved);
    return resolved;
  }

  private resolveSource(
    parsed: ParsedSkill,
    dbSource: string | null,
  ): SkillSource {
    if (dbSource === 'official' || dbSource === 'community' || dbSource === 'custom') {
      return dbSource;
    }
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
    const { search, category, source, limit = 100, offset = 0 } = params;
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
    if (category) {
      skills = skills.filter((s) => s.category === category);
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
   * Toggle a skill's enabled state.
   * Uses (userId, slug) as the upsert key.
   */
  async toggle(userId: number, slug: string, isEnabled: boolean): Promise<void> {
    // Find or create a DB preference record
    const existing = await skillRepository.findByUserIdAndSlug(userId, slug);

    if (existing) {
      await skillRepository.update(userId, existing.id, { isEnabled });
    } else {
      // Get metadata from filesystem to populate required DB columns
      const parsed = this.scanner.scan().find((s) => s.id === slug);
      await skillRepository.create({
        slug,
        name: parsed?.name ?? slug,
        description: parsed?.description ?? '',
        category: 'other',
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
