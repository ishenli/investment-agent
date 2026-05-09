/**
 * SkillContentValidator
 *
 * Scans SKILL.md content for potentially dangerous patterns.
 *
 * Current checks:
 *   1. Inline shell execution markers ( backtick + ! )
 *   2. Dangerous shell command patterns (rm -rf, fork bombs, etc.)
 *   3. YAML frontmatter key allowlist
 *
 * Mode: warn-only by default. Set SKILL_VALIDATION_BLOCK=true to throw.
 */

import logger from '@server/base/logger';

export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

const DANGEROUS_PATTERNS = [
  // Fork bombs
  /\b:\(\)\s*\{\s*:\|:\s*&\s*\}\s*;\s*\b/,
  // rm -rf with absolute or wildcard paths
  /\brm\s+-[a-z]*f\s+.*(?:\/|[~*]|\.-)/i,
  // curl | sh / wget | sh pipelines
  /\b(curl|wget)\b.*\|\s*\b(sh|bash|zsh|fish)\b/,
  // Direct eval of remote code
  /\beval\s*\(\s*\w+/,
  // dd to disk devices
  /\bdd\s+.*of=\/dev\/[sh]d/i,
  // mkfs on block devices
  /\bmkfs\.?\w*\s+\/dev\//i,
];

const ALLOWED_FRONTMATTER_KEYS = new Set([
  'name',
  'description',
  'version',
  'official',
  'isOfficial',
  'category',
  'icon',
  'author',
  'license',
  'tags',
]);

/**
 * Validate skill content for dangerous patterns and structural issues.
 *
 * @param content Raw SKILL.md content (including frontmatter)
 * @returns ValidationResult with any violations found
 */
export function validateSkillContent(content: string): ValidationResult {
  const violations: string[] = [];

  // 1. Inline shell markers: backtick + exclamation (common in markdown to execute shell)
  if (/`!|`\s*!/.test(content)) {
    violations.push('Inline shell execution marker detected (`!`)');
  }

  // 2. Dangerous shell patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(`Dangerous shell pattern detected: ${pattern.source}`);
    }
  }

  // 3. YAML frontmatter key allowlist
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (frontmatterMatch) {
    const fmText = frontmatterMatch[1];
    // Simple key extraction: lines starting with word characters followed by colon
    const keyRegex = /^([A-Za-z_]\w*)\s*:/gm;
    let match: RegExpExecArray | null;
    while ((match = keyRegex.exec(fmText)) !== null) {
      const key = match[1];
      if (!ALLOWED_FRONTMATTER_KEYS.has(key)) {
        violations.push(`Unknown frontmatter key: "${key}"`);
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Warn-only wrapper. Logs violations but never throws.
 * Use this during the burn-in period before enabling hard blocks.
 */
export function warnOnlyValidate(skillSlug: string, content: string): void {
  const { violations } = validateSkillContent(content);
  if (violations.length > 0) {
    for (const v of violations) {
      logger.warn(`[SkillContentValidator] Skill "${skillSlug}": ${v}`);
    }
  }
}

/**
 * Hard-block wrapper. Throws if any violations are found.
 * Controlled by SKILL_VALIDATION_BLOCK env var.
 */
export function strictValidate(skillSlug: string, content: string): void {
  const { valid, violations } = validateSkillContent(content);
  if (!valid) {
    throw new Error(
      `Skill "${skillSlug}" failed content validation:\n` +
        violations.map((v) => `  - ${v}`).join('\n'),
    );
  }
}

/**
 * Entry point used by SkillService. Respects SKILL_VALIDATION_BLOCK env var.
 */
export function validateSkill(skillSlug: string, content: string): void {
  if (process.env.SKILL_VALIDATION_BLOCK === 'true') {
    strictValidate(skillSlug, content);
  } else {
    warnOnlyValidate(skillSlug, content);
  }
}
