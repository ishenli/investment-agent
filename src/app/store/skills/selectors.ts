import type { SkillsState } from './store';

/**
 * Returns the active skill slugs for the given session.
 *
 * Priority:
 * 1. Session-level override (user toggled skills in the tool panel) → use as-is
 * 2. No override yet → fall back to the global isEnabled defaults
 *
 * This mirrors the checked-state logic in SkillToolItem so that the slugs
 * sent to the API always reflect exactly what the user sees in the panel.
 */
export const sessionSkillSlugs = (sessionId: string) => (s: SkillsState): string[] => {
  const sessionSlugs = s.sessionActiveSkills[sessionId];
  if (sessionSlugs !== undefined) {
    // Session-level override exists (may be empty if user disabled everything)
    return sessionSlugs;
  }
  // No override: mirror the global isEnabled defaults
  return s.skills.filter((skill) => skill.isEnabled).map((skill) => skill.slug);
};

/**
 * Returns the pending explicit skill slug for the given session, or null.
 */
export const sessionExplicitSkill = (sessionId: string) => (s: SkillsState): string | null => {
  return s.sessionExplicitSkill[sessionId] ?? null;
};

export const skillsSelectors = {
  sessionSkillSlugs,
  sessionExplicitSkill,
};
