/**
 * Skill utility functions — lightweight helpers for filesystem operations,
 * frontmatter parsing, and platform filtering.
 *
 * Ported from Python hermes-agent's agent/skill_utils.py.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as yaml from 'js-yaml';
import type {
  SkillMetadata,
  SkillContent,
  SkillScanOptions,
} from './types';
import {
  SKILL_FILE_NAME,
  ALLOWED_SUBDIRS,
  PLATFORM_MAP,
} from './types';

// ============== Frontmatter Parsing ==============

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Parse YAML frontmatter from markdown content.
 * Returns the parsed fields and the remaining body content.
 */
export function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  const normalized = raw.replace(/^\uFEFF/, '');
  const match = normalized.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, content: normalized };
  }

  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = yaml.load(match[1]);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, unknown>;
    }
  } catch {
    // Graceful fallback on parse errors
  }

  const content = normalized.slice(match[0].length);
  return { frontmatter, content };
}

/**
 * Build SKILL.md content from frontmatter and prompt body.
 */
export function buildSkillMarkdown(
  frontmatter: Record<string, unknown>,
  prompt: string,
): string {
  const entries = Object.entries(frontmatter).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return prompt.trim() + '\n';

  const yamlStr = entries
    .map(([k, v]) => {
      if (typeof v === 'string') {
        const needsQuote = v.includes(':') || v.includes('#') || v.includes('\n');
        return `${k}: ${needsQuote ? `"${v.replace(/"/g, '\\"')}"` : v}`;
      }
      return `${k}: ${JSON.stringify(v)}`;
    })
    .join('\n');

  return `---\n${yamlStr}\n---\n\n${prompt.trim()}\n`;
}

// ============== Platform Filtering ==============

/**
 * Check if a skill matches the current OS platform.
 */
export function skillMatchesPlatform(frontmatter: Record<string, unknown>): boolean {
  const platforms = frontmatter.platforms;
  if (!Array.isArray(platforms) || platforms.length === 0) return true;

  const currentPlatform = os.platform();
  return platforms.some((p: unknown) => {
    if (typeof p !== 'string') return false;
    const mapped = PLATFORM_MAP[p.toLowerCase()];
    return mapped === currentPlatform;
  });
}

// ============== Directory Traversal ==============

/**
 * List skill directories (directories containing SKILL.md) under a root.
 */
export function listSkillDirs(root: string): string[] {
  if (!fs.existsSync(root)) return [];

  // Check if root itself is a skill
  if (fs.existsSync(path.join(root, SKILL_FILE_NAME))) {
    return [root];
  }

  try {
    return fs.readdirSync(root)
      .map((entry) => path.join(root, entry))
      .filter((entryPath) => {
        try {
          const stat = fs.lstatSync(entryPath);
          if (!stat.isDirectory() && !stat.isSymbolicLink()) return false;
          return fs.existsSync(path.join(entryPath, SKILL_FILE_NAME));
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

/**
 * List supporting files in a skill directory (under allowed subdirs).
 */
export function listSupportingFiles(skillDir: string): string[] {
  const files: string[] = [];

  for (const subdir of ALLOWED_SUBDIRS) {
    const subdirPath = path.join(skillDir, subdir);
    if (!fs.existsSync(subdirPath)) continue;

    try {
      const entries = fs.readdirSync(subdirPath, { recursive: true });
      for (const entry of entries) {
        const entryStr = typeof entry === 'string' ? entry : entry.toString();
        const fullPath = path.join(subdirPath, entryStr);
        try {
          if (fs.statSync(fullPath).isFile()) {
            files.push(path.join(subdir, entryStr));
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  return files;
}

// ============== Skill Parsing ==============

/**
 * Parse a single skill directory into SkillMetadata.
 */
export function parseSkillMetadata(dir: string): SkillMetadata | null {
  const skillFile = path.join(dir, SKILL_FILE_NAME);
  if (!fs.existsSync(skillFile)) return null;

  try {
    const raw = fs.readFileSync(skillFile, 'utf-8');
    const { frontmatter, content } = parseFrontmatter(raw);
    const name = path.basename(dir);
    const displayName = String(frontmatter.name || name).trim() || name;
    const description = String(
      frontmatter.description || extractFirstLine(content) || displayName,
    ).trim();

    return {
      name,
      displayName,
      description,
      category: typeof frontmatter.category === 'string' ? frontmatter.category : undefined,
      version: formatVersion(frontmatter.version),
      isOfficial: isTruthy(frontmatter.official) || isTruthy(frontmatter.isOfficial),
      platforms: Array.isArray(frontmatter.platforms) ? frontmatter.platforms : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Parse a skill directory into full SkillContent (metadata + prompt).
 */
export function parseSkillContent(dir: string): SkillContent | null {
  const skillFile = path.join(dir, SKILL_FILE_NAME);
  if (!fs.existsSync(skillFile)) return null;

  try {
    const raw = fs.readFileSync(skillFile, 'utf-8');
    const { frontmatter, content } = parseFrontmatter(raw);
    const name = path.basename(dir);
    const displayName = String(frontmatter.name || name).trim() || name;
    const description = String(
      frontmatter.description || extractFirstLine(content) || displayName,
    ).trim();

    return {
      name,
      displayName,
      description,
      category: typeof frontmatter.category === 'string' ? frontmatter.category : undefined,
      version: formatVersion(frontmatter.version),
      isOfficial: isTruthy(frontmatter.official) || isTruthy(frontmatter.isOfficial),
      platforms: Array.isArray(frontmatter.platforms) ? frontmatter.platforms : undefined,
      prompt: content.trim(),
      skillDir: dir,
      skillPath: skillFile,
      supportingFiles: listSupportingFiles(dir),
      frontmatter,
    };
  } catch {
    return null;
  }
}

// ============== Scanning ==============

/**
 * Scan one or more skill roots and return a deduplicated list of skills.
 * Later roots override earlier ones (higher priority).
 */
export function scanSkills(
  roots: string[],
  options: SkillScanOptions = {},
): SkillMetadata[] {
  const skillMap = new Map<string, SkillMetadata>();

  for (const root of roots) {
    for (const dir of listSkillDirs(root)) {
      const skill = parseSkillMetadata(dir);
      if (!skill) continue;
      if (options.category && skill.category !== options.category) continue;
      if (options.filterPlatform) {
        const raw = fs.readFileSync(path.join(dir, SKILL_FILE_NAME), 'utf-8');
        const { frontmatter } = parseFrontmatter(raw);
        if (!skillMatchesPlatform(frontmatter)) continue;
      }
      skillMap.set(skill.name, skill);
    }
  }

  return Array.from(skillMap.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

/**
 * Find a skill directory by name across multiple roots.
 * Returns the path of the highest-priority match, or null.
 */
export function findSkillDir(name: string, roots: string[]): string | null {
  // Search roots in reverse order (highest priority first)
  for (let i = roots.length - 1; i >= 0; i--) {
    const candidate = path.join(roots[i], name);
    if (fs.existsSync(path.join(candidate, SKILL_FILE_NAME))) {
      return candidate;
    }
  }
  return null;
}

// ============== Internal Helpers ==============

function extractFirstLine(content: string): string {
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    return trimmed.replace(/^#+\s*/, '');
  }
  return '';
}

function isTruthy(value: unknown): boolean {
  if (value === true) return true;
  if (!value) return false;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
}

function formatVersion(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}
