/**
 * SkillFileScanner
 *
 * Responsibility: filesystem discovery and SKILL.md parsing.
 * Extracted from SkillManager to enforce Single Responsibility Principle.
 */

import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import logger from '@server/base/logger';
import { getProjectRoot, isElectron } from '@server/base/env';
import type { ParsedSkill } from '@/types/skill';

export const SKILLS_DIR_NAME = 'skills';
export const SKILLS_CONFIG_FILE = 'skills.config.json';
export const SKILL_FILE_NAME = 'SKILL.md';

export type SkillDefaultConfig = {
  order?: number;
  enabled?: boolean;
};

export type SkillsConfig = {
  version: number;
  description?: string;
  defaults: Record<string, SkillDefaultConfig>;
};

// ─── Frontmatter helpers ──────────────────────────────────────────────────────

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export const parseFrontmatter = (
  raw: string,
): { frontmatter: Record<string, unknown>; content: string } => {
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
  } catch (e) {
    logger.warn('[SkillFileScanner] Failed to parse YAML frontmatter:', e);
  }

  const content = normalized.slice(match[0].length);
  return { frontmatter, content };
};

export const isTruthy = (value?: unknown): boolean => {
  if (value === true) return true;
  if (!value) return false;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
};

const extractDescription = (content: string): string => {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    return trimmed.replace(/^#+\s*/, '');
  }
  return '';
};

// ─── Directory traversal helpers ─────────────────────────────────────────────

export const listSkillDirs = (root: string): string[] => {
  if (!fs.existsSync(root)) return [];
  const skillFile = path.join(root, SKILL_FILE_NAME);
  if (fs.existsSync(skillFile)) {
    return [root];
  }

  const entries = fs.readdirSync(root);
  return entries
    .map((entry) => path.join(root, entry))
    .filter((entryPath) => {
      try {
        const stat = fs.lstatSync(entryPath);
        if (!stat.isDirectory() && !stat.isSymbolicLink()) {
          return false;
        }
        return fs.existsSync(path.join(entryPath, SKILL_FILE_NAME));
      } catch {
        return false;
      }
    });
};

export const collectSkillDirsFromSource = (source: string): string[] => {
  const resolved = path.resolve(source);
  if (fs.existsSync(path.join(resolved, SKILL_FILE_NAME))) {
    return [resolved];
  }

  const nestedRoot = path.join(resolved, SKILLS_DIR_NAME);
  if (fs.existsSync(nestedRoot) && fs.statSync(nestedRoot).isDirectory()) {
    const nestedSkills = listSkillDirs(nestedRoot);
    if (nestedSkills.length > 0) {
      return nestedSkills;
    }
  }

  const directSkills = listSkillDirs(resolved);
  if (directSkills.length > 0) {
    return directSkills;
  }

  return collectSkillDirsRecursively(resolved);
};

const collectSkillDirsRecursively = (root: string): string[] => {
  const resolvedRoot = path.resolve(root);
  if (!fs.existsSync(resolvedRoot)) return [];

  const matchedDirs: string[] = [];
  const queue: string[] = [resolvedRoot];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const normalized = path.resolve(current);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(normalized);
    } catch {
      continue;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue;

    if (fs.existsSync(path.join(normalized, SKILL_FILE_NAME))) {
      matchedDirs.push(normalized);
      continue;
    }

    let entries: string[] = [];
    try {
      entries = fs.readdirSync(normalized);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry || entry === '.git' || entry === 'node_modules') continue;
      queue.push(path.join(normalized, entry));
    }
  }

  return matchedDirs;
};

// ─── SkillFileScanner class ───────────────────────────────────────────────────

export class SkillFileScanner {
  // ── Path resolution ─────────────────────────────────────────────────────

  getSkillsRoot(): string {
    return path.resolve(getProjectRoot(), SKILLS_DIR_NAME);
  }

  ensureSkillsRoot(): string {
    const root = this.getSkillsRoot();
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }
    return root;
  }

  getUserSkillsRoot(userId: number): string {
    return path.resolve(getProjectRoot(), 'workspace', String(userId), '.hermes', 'skills');
  }

  ensureUserSkillsRoot(userId: number): string {
    const root = this.getUserSkillsRoot(userId);
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }
    return root;
  }

  getBundledSkillsRoot(): string {
    if (isElectron()) {
      const resourcesRoot = path.resolve(process.cwd(), SKILLS_DIR_NAME);
      if (fs.existsSync(resourcesRoot)) {
        return resourcesRoot;
      }
      if (process.env.NEXT_APP_DATA_PATH) {
        return path.resolve(process.env.NEXT_APP_DATA_PATH, SKILLS_DIR_NAME);
      }
      return path.resolve(process.cwd(), SKILLS_DIR_NAME);
    }
    const projectRoot = path.resolve(__dirname, '..');
    return path.resolve(projectRoot, SKILLS_DIR_NAME);
  }

  /**
   * Returns ordered skill roots: bundled (lowest priority) → user (highest priority).
   * Does NOT scan global ~/.claude/skills to keep the app a closed skill ecosystem.
   */
  getSkillRoots(primaryRoot?: string): string[] {
    const resolvedPrimary = primaryRoot ?? this.getSkillsRoot();
    const roots: string[] = [resolvedPrimary];

    const appRoot = this.getBundledSkillsRoot();
    if (appRoot !== resolvedPrimary && fs.existsSync(appRoot)) {
      roots.push(appRoot);
    }
    return roots;
  }

  // ── Defaults loading ─────────────────────────────────────────────────────

  loadSkillsDefaults(roots: string[]): Record<string, SkillDefaultConfig> {
    const merged: Record<string, SkillDefaultConfig> = {};
    const reversedRoots = [...roots].reverse();

    for (const root of reversedRoots) {
      const configPath = path.join(root, SKILLS_CONFIG_FILE);
      if (!fs.existsSync(configPath)) continue;

      try {
        const raw = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(raw) as SkillsConfig;
        if (config.defaults && typeof config.defaults === 'object') {
          for (const [id, settings] of Object.entries(config.defaults)) {
            merged[id] = { ...merged[id], ...settings };
          }
        }
      } catch (error) {
        logger.warn('[SkillFileScanner] Failed to load skills config:', configPath, error);
      }
    }

    return merged;
  }

  // ── Built-in skill IDs ───────────────────────────────────────────────────

  listBuiltInSkillIds(): Set<string> {
    const builtInRoot = this.getBundledSkillsRoot();
    if (!builtInRoot || !fs.existsSync(builtInRoot)) {
      return new Set();
    }
    return new Set(listSkillDirs(builtInRoot).map((dir) => path.basename(dir)));
  }

  // ── Parsing ──────────────────────────────────────────────────────────────

  /**
   * Parse a single skill directory into a ParsedSkill object.
   * Returns null if SKILL.md is missing or unreadable.
   */
  parseSkillDir(dir: string, isBuiltIn: boolean): ParsedSkill | null {
    const skillFile = path.join(dir, SKILL_FILE_NAME);
    if (!fs.existsSync(skillFile)) return null;

    try {
      const raw = fs.readFileSync(skillFile, 'utf8');
      const { frontmatter, content } = parseFrontmatter(raw);
      const id = path.basename(dir);
      const name =
        (String(frontmatter.name || '') || id).trim() || id;
      const description = (
        String(frontmatter.description || '') ||
        extractDescription(content) ||
        name
      ).trim();
      const isOfficial = isTruthy(frontmatter.official) || isTruthy(frontmatter.isOfficial);
      const version =
        typeof frontmatter.version === 'string'
          ? frontmatter.version
          : typeof frontmatter.version === 'number'
            ? String(frontmatter.version)
            : undefined;
      const updatedAt = fs.statSync(skillFile).mtimeMs;
      const prompt = content.trim();

      return {
        id,
        name,
        description,
        isOfficial,
        isBuiltIn,
        updatedAt,
        prompt,
        skillPath: skillFile,
        version,
      };
    } catch (error) {
      logger.warn('[SkillFileScanner] Failed to parse skill:', dir, error);
      return null;
    }
  }

  getSkillVersion(skillDir: string): string {
    try {
      const raw = fs.readFileSync(path.join(skillDir, SKILL_FILE_NAME), 'utf8');
      const { frontmatter } = parseFrontmatter(raw);
      return typeof frontmatter.version === 'string'
        ? frontmatter.version
        : typeof frontmatter.version === 'number'
          ? String(frontmatter.version)
          : '';
    } catch {
      return '';
    }
  }

  // ── Full scan ────────────────────────────────────────────────────────────

  /**
   * Scan all skill roots and return a deduplicated, sorted list of ParsedSkills.
   * Skills from higher-priority roots override lower-priority ones with the same id.
   */
  scan(): ParsedSkill[] {
    const primaryRoot = this.ensureSkillsRoot();
    const roots = this.getSkillRoots(primaryRoot);
    // Lower priority roots first so higher priority roots overwrite in skillMap
    const orderedRoots = roots.filter((r) => r !== primaryRoot).concat(primaryRoot);
    const defaults = this.loadSkillsDefaults(roots);
    const builtInSkillIds = this.listBuiltInSkillIds();
    const skillMap = new Map<string, ParsedSkill>();

    orderedRoots.forEach((root) => {
      if (!fs.existsSync(root)) return;
      listSkillDirs(root).forEach((dir) => {
        const skill = this.parseSkillDir(dir, builtInSkillIds.has(path.basename(dir)));
        if (!skill) return;
        skillMap.set(skill.id, skill);
      });
    });

    const skills = Array.from(skillMap.values());

    skills.sort((a, b) => {
      const orderA = defaults[a.id]?.order ?? 999;
      const orderB = defaults[b.id]?.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    return skills;
  }

  /**
   * Scan skill roots for a specific user.
   * Uses the user's per-user skills directory as the primary (highest-priority) root,
   * followed by bundled skills.
   */
  scanForUser(userId: number): ParsedSkill[] {
    const userRoot = this.ensureUserSkillsRoot(userId);
    const roots = this.getSkillRoots(userRoot);
    // Lower priority roots first so higher priority roots overwrite in skillMap
    const orderedRoots = roots.filter((r) => r !== userRoot).concat(userRoot);
    const defaults = this.loadSkillsDefaults(roots);
    const builtInSkillIds = this.listBuiltInSkillIds();
    const skillMap = new Map<string, ParsedSkill>();

    orderedRoots.forEach((root) => {
      if (!fs.existsSync(root)) return;
      listSkillDirs(root).forEach((dir) => {
        const skill = this.parseSkillDir(dir, builtInSkillIds.has(path.basename(dir)));
        if (!skill) return;
        skillMap.set(skill.id, skill);
      });
    });

    const skills = Array.from(skillMap.values());

    skills.sort((a, b) => {
      const orderA = defaults[a.id]?.order ?? 999;
      const orderB = defaults[b.id]?.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    return skills;
  }

  /**
   * Find skill directories inside a given source path (for install use).
   */
  collectFromSource(source: string): string[] {
    return collectSkillDirsFromSource(source);
  }
}

export const skillFileScanner = new SkillFileScanner();
