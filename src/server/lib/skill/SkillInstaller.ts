/**
 * SkillInstaller
 *
 * Responsibility: downloading and installing skills from external sources
 * (GitHub/Git, ZIP archives, local directories).
 * Extracted from SkillManager to enforce Single Responsibility Principle.
 */

import path from 'path';
import fs from 'fs';
import logger from '@server/base/logger';
import { getProjectRoot, isElectron } from '@server/base/env';
import { cpRecursiveSync, compareVersions } from '../utils/fsCompat';
import { isZipFile, normalizeFolderName, resolveWithin } from '../../utils/file';
import {
  deriveRepoName,
  downloadGithubArchive,
  extractErrorMessage,
  NormalizedGitSource,
  parseGithubRepoSource,
  parseGithubTreeOrBlobUrl,
  resolveGitCommand,
} from '../../utils/git';
import extractZip from 'extract-zip';
import { runCommand } from '../../utils/command';
import {
  SkillFileScanner,
  SKILL_FILE_NAME,
  SKILLS_CONFIG_FILE,
  listSkillDirs,
  collectSkillDirsFromSource,
  parseFrontmatter,
} from './SkillFileScanner';
import type { InstallResult } from '@/types/skill';

const cleanupPathSafely = (targetPath: string | null): void => {
  if (!targetPath) return;
  try {
    fs.rmSync(targetPath, {
      recursive: true,
      force: true,
      maxRetries: process.platform === 'win32' ? 5 : 0,
      retryDelay: process.platform === 'win32' ? 200 : 0,
    });
  } catch (error) {
    logger.warn('[SkillInstaller] Failed to cleanup temporary directory:', targetPath, error);
  }
};

const isWebSearchSkillBroken = (skillRoot: string): boolean => {
  const startServerScript = path.join(skillRoot, 'scripts', 'start-server.sh');
  const searchScript = path.join(skillRoot, 'scripts', 'search.sh');
  const serverEntry = path.join(skillRoot, 'dist', 'server', 'index.js');
  const requiredPaths = [
    startServerScript,
    searchScript,
    serverEntry,
    path.join(skillRoot, 'node_modules', 'iconv-lite', 'encodings', 'index.js'),
  ];

  if (requiredPaths.some((p) => !fs.existsSync(p))) {
    return true;
  }

  try {
    const startScript = fs.readFileSync(startServerScript, 'utf-8');
    const searchScriptContent = fs.readFileSync(searchScript, 'utf-8');
    const serverEntryContent = fs.readFileSync(serverEntry, 'utf-8');
    if (!startScript.includes('WEB_SEARCH_FORCE_REPAIR')) return true;
    if (!startScript.includes('detect_healthy_bridge_server')) return true;
    if (!searchScriptContent.includes('ACTIVE_SERVER_URL')) return true;
    if (!searchScriptContent.includes('try_switch_to_local_server')) return true;
    if (!searchScriptContent.includes('build_search_payload')) return true;
    if (!searchScriptContent.includes('@query_file')) return true;
    if (!serverEntryContent.includes('decodeJsonRequestBody')) return true;
    if (!serverEntryContent.includes("TextDecoder('gb18030'")) return true;
    if (
      serverEntryContent.includes('scoreDecodedJsonText') &&
      serverEntryContent.includes('Request body decoded using gb18030 (score')
    ) {
      return true;
    }
  } catch {
    return true;
  }

  return false;
};

export class SkillInstaller {
  private scanner: SkillFileScanner;

  constructor(scanner?: SkillFileScanner) {
    this.scanner = scanner ?? new SkillFileScanner();
  }

  // ── Custom skill creation ─────────────────────────────────────────────────

  /**
   * Create a custom skill by writing a SKILL.md file.
   * @param slug Skill directory name (used as identifier)
   * @param content SKILL.md content with frontmatter
   * @returns Path to created skill directory
   */
  createCustomSkill(slug: string, content: string): string {
    const root = this.scanner.ensureSkillsRoot();
    const skillDir = resolveWithin(root, slug);

    // Check if skill already exists
    if (fs.existsSync(skillDir)) {
      throw new Error(`Skill "${slug}" already exists`);
    }

    // Create directory and SKILL.md file
    fs.mkdirSync(skillDir, { recursive: true });
    const skillPath = path.join(skillDir, SKILL_FILE_NAME);
    fs.writeFileSync(skillPath, content, 'utf-8');

    logger.info(`[SkillInstaller] Created custom skill: ${slug}`);
    return skillDir;
  }

  /**
   * Update an existing custom skill's SKILL.md file.
   * @param slug Skill directory name
   * @param updates Updates to apply (name, description, prompt, etc.)
   */
  updateCustomSkillFiles(slug: string, updates: {
    name?: string;
    description?: string;
    prompt?: string;
  }): void {
    const root = this.scanner.getSkillsRoot();
    const skillDir = resolveWithin(root, slug);
    const skillPath = path.join(skillDir, SKILL_FILE_NAME);

    if (!fs.existsSync(skillPath)) {
      throw new Error(`Skill "${slug}" not found on filesystem`);
    }

    // Read existing content
    const raw = fs.readFileSync(skillPath, 'utf-8');
    const { frontmatter, content } = parseFrontmatter(raw);

    // Update frontmatter if provided
    if (updates.name !== undefined) {
      frontmatter.name = updates.name;
    }
    if (updates.description !== undefined) {
      frontmatter.description = updates.description;
    }

    // Reconstruct SKILL.md
    const newPrompt = updates.prompt !== undefined ? updates.prompt : content;
    const newContent = this.buildSkillMarkdown(frontmatter, newPrompt);

    fs.writeFileSync(skillPath, newContent, 'utf-8');
    logger.info(`[SkillInstaller] Updated custom skill: ${slug}`);
  }

  /**
   * Delete a custom skill's files from filesystem.
   * @param slug Skill directory name
   */
  deleteCustomSkillFiles(slug: string): void {
    const root = this.scanner.getSkillsRoot();
    const skillDir = resolveWithin(root, slug);

    if (!fs.existsSync(skillDir)) {
      throw new Error(`Skill "${slug}" not found on filesystem`);
    }

    fs.rmSync(skillDir, { recursive: true, force: true });
    logger.info(`[SkillInstaller] Deleted custom skill files: ${slug}`);
  }

  /**
   * Build SKILL.md content from frontmatter and prompt.
   */
  private buildSkillMarkdown(frontmatter: Record<string, unknown>, prompt: string): string {
    const yamlContent = Object.keys(frontmatter).length > 0
      ? `---\n${this.toYaml(frontmatter)}\n---\n`
      : '';
    return `${yamlContent}${prompt.trim()}\n`;
  }

  /**
   * Simple YAML serializer for frontmatter.
   */
  private toYaml(obj: Record<string, unknown>, indent = 0): string {
    const spaces = '  '.repeat(indent);
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;

      if (typeof value === 'string') {
        // Quote strings that might need it
        const needsQuote = value.includes(':') || value.includes('#') || value.includes('\n');
        lines.push(`${spaces}${key}: ${needsQuote ? `"${value.replace(/"/g, '\\"')}"` : value}`);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${spaces}${key}: ${value}`);
      } else if (value === null) {
        lines.push(`${spaces}${key}: null`);
      }
    }

    return lines.join('\n');
  }

  // ── Git source normalization ─────────────────────────────────────────────

  private normalizeGitSource(source: string): NormalizedGitSource | null {
    const githubTreeOrBlob = parseGithubTreeOrBlobUrl(source);
    if (githubTreeOrBlob) return githubTreeOrBlob;

    if (/^[\w.-]+\/[\w.-]+$/.test(source)) {
      return { repoUrl: `https://github.com/${source}.git` };
    }
    if (
      source.startsWith('http://') ||
      source.startsWith('https://') ||
      source.startsWith('git@') ||
      source.endsWith('.git')
    ) {
      return { repoUrl: source };
    }
    return null;
  }

  // ── Install from a generic source string ────────────────────────────────

  /**
   * Install skill(s) from a source string.
   * Supports: local path (dir / zip / SKILL.md), GitHub URL, owner/repo shorthand.
   */
  async install(source: string): Promise<InstallResult & { skills?: never }> {
    let cleanupPath: string | null = null;

    try {
      const trimmed = source.trim();
      if (!trimmed) {
        return { success: false, error: 'Missing skill source' };
      }

      const root = this.scanner.ensureSkillsRoot();
      let localSource = trimmed;

      // ── Local path ──────────────────────────────────────────────────────
      if (fs.existsSync(localSource)) {
        const stat = fs.statSync(localSource);
        if (stat.isFile()) {
          if (isZipFile(localSource)) {
            const tempRoot = fs.mkdtempSync(
              path.join(getProjectRoot(), 'temp', 'skill-zip-'),
            );
            await extractZip(localSource, { dir: tempRoot });
            localSource = tempRoot;
            cleanupPath = tempRoot;
          } else if (path.basename(localSource) === SKILL_FILE_NAME) {
            localSource = path.dirname(localSource);
          } else {
            return {
              success: false,
              error: 'Skill source must be a directory, zip file, or SKILL.md file',
            };
          }
        }
      } else {
        // ── Remote source ────────────────────────────────────────────────
        const normalized = this.normalizeGitSource(trimmed);
        if (!normalized) {
          return {
            success: false,
            error: 'Invalid skill source. Use owner/repo, repo URL, or a GitHub tree/blob URL.',
          };
        }

        const tempRoot = fs.mkdtempSync(path.join(getProjectRoot(), 'temp', 'skill-'));
        cleanupPath = tempRoot;
        const repoName = normalizeFolderName(
          normalized.repoNameHint || deriveRepoName(normalized.repoUrl),
        );
        const clonePath = path.join(tempRoot, repoName);
        const cloneArgs = ['clone', '--depth', '1'];
        if (normalized.ref) {
          cloneArgs.push('--branch', normalized.ref);
        }
        cloneArgs.push(normalized.repoUrl, clonePath);

        const gitRuntime = resolveGitCommand();
        const githubSource = parseGithubRepoSource(normalized.repoUrl);
        let downloadedSourceRoot = clonePath;

        try {
          await runCommand(gitRuntime.command, cloneArgs, { env: gitRuntime.env });
        } catch (error) {
          const errno = (error as NodeJS.ErrnoException | null)?.code;
          if (githubSource) {
            try {
              downloadedSourceRoot = await downloadGithubArchive(
                githubSource,
                tempRoot,
                normalized.ref,
              );
            } catch (archiveError) {
              const gitMessage = extractErrorMessage(error);
              const archiveMessage = extractErrorMessage(archiveError);
              if (errno === 'ENOENT' && process.platform === 'win32') {
                throw new Error(
                  'Git executable not found. Please install Git for Windows or reinstall the app with bundled PortableGit.' +
                    ` Archive fallback also failed: ${archiveMessage}`,
                );
              }
              throw new Error(
                `Git clone failed: ${gitMessage}. Archive fallback failed: ${archiveMessage}`,
              );
            }
          } else if (errno === 'ENOENT' && process.platform === 'win32') {
            throw new Error(
              'Git executable not found. Please install Git for Windows or reinstall the app with bundled PortableGit.',
            );
          } else {
            throw error;
          }
        }

        if (normalized.sourceSubpath) {
          const scopedSource = resolveWithin(downloadedSourceRoot, normalized.sourceSubpath);
          if (!fs.existsSync(scopedSource)) {
            return {
              success: false,
              error: `Path "${normalized.sourceSubpath}" not found in repository`,
            };
          }
          const scopedStat = fs.statSync(scopedSource);
          if (scopedStat.isFile()) {
            if (path.basename(scopedSource) === SKILL_FILE_NAME) {
              localSource = path.dirname(scopedSource);
            } else {
              return {
                success: false,
                error: 'GitHub path must point to a directory or SKILL.md file',
              };
            }
          } else {
            localSource = scopedSource;
          }
        } else {
          localSource = downloadedSourceRoot;
        }
      }

      // ── Copy skill dirs to user root ─────────────────────────────────────
      const skillDirs = collectSkillDirsFromSource(localSource);
      if (skillDirs.length === 0) {
        cleanupPathSafely(cleanupPath);
        cleanupPath = null;
        return { success: false, error: 'No SKILL.md found in source' };
      }

      const installedSlugs: string[] = [];
      for (const skillDir of skillDirs) {
        const folderName = normalizeFolderName(path.basename(skillDir));
        let targetDir = resolveWithin(root, folderName);
        let suffix = 1;
        while (fs.existsSync(targetDir)) {
          targetDir = resolveWithin(root, `${folderName}-${suffix}`);
          suffix += 1;
        }
        cpRecursiveSync(skillDir, targetDir);
        installedSlugs.push(path.basename(targetDir));
      }

      cleanupPathSafely(cleanupPath);
      cleanupPath = null;

      logger.info('[SkillInstaller] Installed skills:', installedSlugs);
      return { success: true, message: '技能安装成功', installedSlugs };
    } catch (error) {
      cleanupPathSafely(cleanupPath);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to install skill',
      };
    }
  }

  // ── Bundled skills sync ──────────────────────────────────────────────────

  /**
   * Sync bundled (app-shipped) skills to user data directory.
   * Only runs in Electron builds.
   */
  syncBundledToUserData(): void {
    if (!isElectron()) return;

    const userRoot = this.scanner.ensureSkillsRoot();
    const bundledRoot = this.scanner.getBundledSkillsRoot();
    if (!bundledRoot || bundledRoot === userRoot || !fs.existsSync(bundledRoot)) {
      logger.info('[SkillInstaller] syncBundledToUserData: bundledRoot skipped');
      return;
    }

    try {
      const bundledSkillDirs = listSkillDirs(bundledRoot);
      logger.info('[SkillInstaller] Found', bundledSkillDirs.length, 'bundled skills');

      bundledSkillDirs.forEach((dir) => {
        const id = path.basename(dir);
        const targetDir = path.join(userRoot, id);
        const targetExists = fs.existsSync(targetDir);

        let shouldRepair = false;
        let needsCleanCopy = false;

        if (targetExists) {
          const bundledVer = this.scanner.getSkillVersion(dir);
          if (
            bundledVer &&
            compareVersions(bundledVer, this.scanner.getSkillVersion(targetDir) || '0.0.0') > 0
          ) {
            shouldRepair = true;
            needsCleanCopy = true;
          } else if (id === 'web-search' && isWebSearchSkillBroken(targetDir)) {
            shouldRepair = true;
          } else if (!this.isSkillRuntimeHealthy(targetDir, dir)) {
            shouldRepair = true;
          }
        }

        if (targetExists && !shouldRepair) return;

        try {
          let envBackup: Buffer | null = null;
          const envPath = path.join(targetDir, '.env');
          if (needsCleanCopy && fs.existsSync(envPath)) {
            envBackup = fs.readFileSync(envPath);
          }
          if (needsCleanCopy) {
            fs.rmSync(targetDir, { recursive: true, force: true });
          }
          cpRecursiveSync(dir, targetDir, { dereference: true, force: shouldRepair });
          if (envBackup !== null) {
            fs.writeFileSync(envPath, envBackup);
          }
          logger.info(`[SkillInstaller] Synced bundled skill "${id}"`);
        } catch (error) {
          logger.warn(`[SkillInstaller] Failed to sync bundled skill "${id}":`, error);
        }
      });

      // Sync skills.config.json
      const bundledConfig = path.join(bundledRoot, SKILLS_CONFIG_FILE);
      const targetConfig = path.join(userRoot, SKILLS_CONFIG_FILE);
      if (fs.existsSync(bundledConfig)) {
        if (!fs.existsSync(targetConfig)) {
          cpRecursiveSync(bundledConfig, targetConfig);
        } else {
          this.mergeSkillsConfig(bundledConfig, targetConfig);
        }
      }

      logger.info('[SkillInstaller] syncBundledToUserData: done');
    } catch (error) {
      logger.warn('[SkillInstaller] Failed to sync bundled skills:', error);
    }
  }

  private isSkillRuntimeHealthy(targetDir: string, bundledDir: string): boolean {
    const bundledNodeModules = path.join(bundledDir, 'node_modules');
    const targetNodeModules = path.join(targetDir, 'node_modules');
    const targetPackageJson = path.join(targetDir, 'package.json');

    if (!fs.existsSync(targetPackageJson)) return true;
    if (!fs.existsSync(bundledNodeModules)) return true;
    if (!fs.existsSync(targetNodeModules)) return false;
    return true;
  }

  private mergeSkillsConfig(bundledPath: string, targetPath: string): void {
    try {
      const bundled = JSON.parse(fs.readFileSync(bundledPath, 'utf-8'));
      const target = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
      if (!bundled.defaults || !target.defaults) return;

      let changed = false;
      for (const [id, config] of Object.entries(bundled.defaults)) {
        if (!(id in target.defaults)) {
          target.defaults[id] = config;
          changed = true;
        }
      }
      if (changed) {
        const tmpPath = targetPath + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(target, null, 2) + '\n', 'utf-8');
        fs.renameSync(tmpPath, targetPath);
        logger.info('[SkillInstaller] Merged new skill entries into user config');
      }
    } catch (e) {
      logger.warn('[SkillInstaller] Failed to merge skills config:', e);
    }
  }
}

export const skillInstaller = new SkillInstaller();
