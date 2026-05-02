/**
 * skill_manage tool — Skill self-iteration (自迭代).
 *
 * Enables agents to create, edit, patch, and delete skills, as well as
 * manage supporting files. This is the core mechanism for skill evolution:
 * agents capture successful workflows as new skills and incrementally
 * improve existing ones through fuzzy-matched patches.
 *
 * Actions:
 *   - create: Create a new user skill
 *   - edit:   Full rewrite of an existing skill's SKILL.md
 *   - patch:  Targeted find-and-replace with fuzzy matching
 *   - delete: Remove a user skill
 *   - write_file:  Add/overwrite a supporting file
 *   - remove_file: Remove a supporting file
 *
 * Ported from Python hermes-agent's tools/skill_manager_tool.py.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Type, type TUnion, type TLiteral } from '@sinclair/typebox';
import type { TextContent } from '@mariozechner/pi-ai';
import {
  SKILL_FILE_NAME,
  ALLOWED_SUBDIRS,
  MAX_NAME_LENGTH,
  MAX_SKILL_CONTENT_CHARS,
  MAX_SKILL_FILE_BYTES,
  VALID_NAME_RE,
} from './types';
import type { SkillManageAction, SkillManageResult } from './types';
import { parseFrontmatter, findSkillDir } from './skill-utils';

// ============== Schema ==============

export const skillManageSchema = Type.Object({
  action: Type.Union([
    Type.Literal('create'),
    Type.Literal('edit'),
    Type.Literal('patch'),
    Type.Literal('delete'),
    Type.Literal('write_file'),
    Type.Literal('remove_file'),
  ] as [TLiteral<'create'>, TLiteral<'edit'>, TLiteral<'patch'>, TLiteral<'delete'>, TLiteral<'write_file'>, TLiteral<'remove_file'>], {
    description: 'Action to perform: create, edit, patch, delete, write_file, remove_file',
  }) as TUnion<[TLiteral<'create'>, TLiteral<'edit'>, TLiteral<'patch'>, TLiteral<'delete'>, TLiteral<'write_file'>, TLiteral<'remove_file'>]>,
  name: Type.String({ description: 'Skill name (slug format: lowercase, hyphens, dots)' }),
  content: Type.Optional(
    Type.String({ description: 'Full SKILL.md content (for create/edit). Must include YAML frontmatter.' }),
  ),
  category: Type.Optional(
    Type.String({ description: 'Category directory name (for create only)' }),
  ),
  file_path: Type.Optional(
    Type.String({ description: 'Relative file path within skill dir (for write_file/remove_file, or patch on supporting files)' }),
  ),
  file_content: Type.Optional(
    Type.String({ description: 'File content (for write_file)' }),
  ),
  old_string: Type.Optional(
    Type.String({ description: 'Text to find (for patch action)' }),
  ),
  new_string: Type.Optional(
    Type.String({ description: 'Replacement text (for patch action)' }),
  ),
  replace_all: Type.Optional(
    Type.Boolean({ description: 'Replace all occurrences (default: false, for patch action)' }),
  ),
});

// ============== Handler Factory ==============

/**
 * Create a skill_manage handler bound to a local skills directory.
 *
 * @param localSkillsDir — The writable skills directory (e.g. ~/.hermes/skills/)
 * @param allRoots — All skill roots (for finding skills across directories)
 */
export function createSkillManageHandler(
  localSkillsDir: string,
  allRoots: string[],
) {
  return async function skillManageHandler(
    _toolCallId: string,
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[]; isError?: boolean }> {
    const action = String(args.action ?? '') as SkillManageAction;
    const name = String(args.name ?? '').trim();

    try {
      let result: SkillManageResult;

      switch (action) {
        case 'create':
          result = handleCreate(localSkillsDir, name, args);
          break;
        case 'edit':
          result = handleEdit(localSkillsDir, allRoots, name, args);
          break;
        case 'patch':
          result = handlePatch(localSkillsDir, allRoots, name, args);
          break;
        case 'delete':
          result = handleDelete(localSkillsDir, allRoots, name);
          break;
        case 'write_file':
          result = handleWriteFile(localSkillsDir, allRoots, name, args);
          break;
        case 'remove_file':
          result = handleRemoveFile(localSkillsDir, allRoots, name, args);
          break;
        default:
          result = {
            success: false,
            message: `Unknown action "${action}". Valid: create, edit, patch, delete, write_file, remove_file.`,
          };
      }

      return {
        content: [{ type: 'text', text: result.message }],
        isError: !result.success,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true,
      };
    }
  };
}

// ============== Action Handlers ==============

function handleCreate(
  localDir: string,
  name: string,
  args: Record<string, unknown>,
): SkillManageResult {
  const content = String(args.content ?? '');
  const category = args.category ? String(args.category).trim() : undefined;

  // Validate
  const nameErr = validateName(name);
  if (nameErr) return { success: false, message: nameErr };

  const contentErr = validateFrontmatter(content);
  if (contentErr) return { success: false, message: contentErr };

  const sizeErr = validateContentSize(content, 'skill content');
  if (sizeErr) return { success: false, message: sizeErr };

  if (category) {
    const catErr = validateCategory(category);
    if (catErr) return { success: false, message: catErr };
  }

  // Determine target directory
  const parentDir = category ? path.join(localDir, category) : localDir;
  const skillDir = path.join(parentDir, name);

  if (fs.existsSync(skillDir)) {
    return { success: false, message: `Skill "${name}" already exists. Use 'edit' or 'patch' instead.` };
  }

  // Create
  fs.mkdirSync(skillDir, { recursive: true });
  atomicWriteText(path.join(skillDir, SKILL_FILE_NAME), content);

  return {
    success: true,
    message: `Created skill "${name}" at ${skillDir}`,
    skillName: name,
  };
}

function handleEdit(
  localDir: string,
  allRoots: string[],
  name: string,
  args: Record<string, unknown>,
): SkillManageResult {
  const content = String(args.content ?? '');

  const nameErr = validateName(name);
  if (nameErr) return { success: false, message: nameErr };

  const contentErr = validateFrontmatter(content);
  if (contentErr) return { success: false, message: contentErr };

  const sizeErr = validateContentSize(content, 'skill content');
  if (sizeErr) return { success: false, message: sizeErr };

  const skillDir = findSkillDir(name, allRoots);
  if (!skillDir) {
    return { success: false, message: `Skill "${name}" not found.` };
  }

  if (!isLocalSkill(skillDir, localDir)) {
    return { success: false, message: `Cannot edit "${name}": only local skills can be modified.` };
  }

  atomicWriteText(path.join(skillDir, SKILL_FILE_NAME), content);
  return {
    success: true,
    message: `Updated skill "${name}"`,
    skillName: name,
  };
}

function handlePatch(
  localDir: string,
  allRoots: string[],
  name: string,
  args: Record<string, unknown>,
): SkillManageResult {
  const oldString = String(args.old_string ?? '');
  const newString = String(args.new_string ?? '');
  const filePath = args.file_path ? String(args.file_path).trim() : undefined;
  const replaceAll = Boolean(args.replace_all ?? false);

  if (!oldString) {
    return { success: false, message: 'old_string is required for patch action.' };
  }

  const nameErr = validateName(name);
  if (nameErr) return { success: false, message: nameErr };

  const skillDir = findSkillDir(name, allRoots);
  if (!skillDir) {
    return { success: false, message: `Skill "${name}" not found.` };
  }

  if (!isLocalSkill(skillDir, localDir)) {
    return { success: false, message: `Cannot patch "${name}": only local skills can be modified.` };
  }

  // Determine target file
  let targetPath: string;
  if (filePath) {
    const fpErr = validateFilePath(filePath);
    if (fpErr) return { success: false, message: fpErr };
    targetPath = path.resolve(skillDir, filePath);
    if (!targetPath.startsWith(path.resolve(skillDir))) {
      return { success: false, message: 'Path traversal detected.' };
    }
  } else {
    targetPath = path.join(skillDir, SKILL_FILE_NAME);
  }

  if (!fs.existsSync(targetPath)) {
    return { success: false, message: `File not found: ${filePath || SKILL_FILE_NAME}` };
  }

  const content = fs.readFileSync(targetPath, 'utf-8');

  // Try exact match first
  if (content.includes(oldString)) {
    const result = applyPatch(content, oldString, newString, replaceAll);
    if (!result.success) {
      return { success: false, message: result.detail || 'Patch failed.' };
    }
    atomicWriteText(targetPath, result.patched!);
    return {
      success: true,
      message: `Patched "${name}"${filePath ? ` (${filePath})` : ''}: ${result.detail}`,
      skillName: name,
      filePath,
    };
  }

  // Fuzzy matching fallback
  const fuzzyResult = fuzzyPatch(content, oldString, newString, replaceAll);
  if (fuzzyResult.success) {
    atomicWriteText(targetPath, fuzzyResult.patched!);
    return {
      success: true,
      message: `Patched "${name}" (fuzzy match)${filePath ? ` (${filePath})` : ''}: ${fuzzyResult.detail}`,
      skillName: name,
      filePath,
    };
  }

  return {
    success: false,
    message: `old_string not found in ${filePath || SKILL_FILE_NAME}. ${fuzzyResult.detail || 'No near matches.'}`,
  };
}

function handleDelete(
  localDir: string,
  allRoots: string[],
  name: string,
): SkillManageResult {
  const nameErr = validateName(name);
  if (nameErr) return { success: false, message: nameErr };

  const skillDir = findSkillDir(name, allRoots);
  if (!skillDir) {
    return { success: false, message: `Skill "${name}" not found.` };
  }

  if (!isLocalSkill(skillDir, localDir)) {
    return { success: false, message: `Cannot delete "${name}": only local skills can be removed.` };
  }

  fs.rmSync(skillDir, { recursive: true, force: true });
  return {
    success: true,
    message: `Deleted skill "${name}"`,
    skillName: name,
  };
}

function handleWriteFile(
  localDir: string,
  allRoots: string[],
  name: string,
  args: Record<string, unknown>,
): SkillManageResult {
  const filePath = String(args.file_path ?? '').trim();
  const fileContent = String(args.file_content ?? '');

  if (!filePath) {
    return { success: false, message: 'file_path is required for write_file action.' };
  }

  const fpErr = validateFilePath(filePath);
  if (fpErr) return { success: false, message: fpErr };

  const sizeErr = validateContentSize(fileContent, 'file content');
  if (sizeErr) return { success: false, message: sizeErr };

  const skillDir = findSkillDir(name, allRoots);
  if (!skillDir) {
    return { success: false, message: `Skill "${name}" not found.` };
  }

  if (!isLocalSkill(skillDir, localDir)) {
    return { success: false, message: `Cannot write files in "${name}": only local skills can be modified.` };
  }

  const targetPath = path.resolve(skillDir, filePath);
  if (!targetPath.startsWith(path.resolve(skillDir))) {
    return { success: false, message: 'Path traversal detected.' };
  }

  // Check file size in bytes
  const byteLen = Buffer.byteLength(fileContent, 'utf-8');
  if (byteLen > MAX_SKILL_FILE_BYTES) {
    return { success: false, message: `File too large: ${byteLen} bytes (max ${MAX_SKILL_FILE_BYTES}).` };
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  atomicWriteText(targetPath, fileContent);

  return {
    success: true,
    message: `Wrote file "${filePath}" in skill "${name}"`,
    skillName: name,
    filePath,
  };
}

function handleRemoveFile(
  localDir: string,
  allRoots: string[],
  name: string,
  args: Record<string, unknown>,
): SkillManageResult {
  const filePath = String(args.file_path ?? '').trim();

  if (!filePath) {
    return { success: false, message: 'file_path is required for remove_file action.' };
  }

  const fpErr = validateFilePath(filePath);
  if (fpErr) return { success: false, message: fpErr };

  const skillDir = findSkillDir(name, allRoots);
  if (!skillDir) {
    return { success: false, message: `Skill "${name}" not found.` };
  }

  if (!isLocalSkill(skillDir, localDir)) {
    return { success: false, message: `Cannot remove files in "${name}": only local skills can be modified.` };
  }

  const targetPath = path.resolve(skillDir, filePath);
  if (!targetPath.startsWith(path.resolve(skillDir))) {
    return { success: false, message: 'Path traversal detected.' };
  }

  if (!fs.existsSync(targetPath)) {
    return { success: false, message: `File not found: ${filePath}` };
  }

  fs.unlinkSync(targetPath);

  // Clean up empty parent directories
  const parentDir = path.dirname(targetPath);
  try {
    const remaining = fs.readdirSync(parentDir);
    if (remaining.length === 0 && parentDir !== path.resolve(skillDir)) {
      fs.rmdirSync(parentDir);
    }
  } catch {
    // Ignore cleanup errors
  }

  return {
    success: true,
    message: `Removed file "${filePath}" from skill "${name}"`,
    skillName: name,
    filePath,
  };
}

// ============== Fuzzy Matching ==============

interface PatchResult {
  success: boolean;
  patched?: string;
  detail?: string;
}

/**
 * Apply an exact-match patch to content.
 */
function applyPatch(
  content: string,
  oldString: string,
  newString: string,
  replaceAll: boolean,
): PatchResult & { patched?: string } {
  if (!replaceAll) {
    const occurrences = content.split(oldString).length - 1;
    if (occurrences > 1) {
      return {
        success: false,
        detail: `old_string found ${occurrences} times. Use replace_all=true or provide more context.`,
      };
    }
  }

  const patched = replaceAll
    ? content.replaceAll(oldString, newString)
    : content.replace(oldString, newString);

  const lines = oldString.split('\n').length;
  return {
    success: true,
    patched,
    detail: `replaced ${lines} line(s)${replaceAll ? ' (all occurrences)' : ''}`,
  };
}

/**
 * Attempt a fuzzy-matched patch when exact match fails.
 *
 * Fuzzy matching handles common agent formatting differences:
 *   - Leading/trailing whitespace differences
 *   - Indentation mismatches
 *   - Line ending normalization
 *   - Block-anchor matching (first + last line matching)
 */
function fuzzyPatch(
  content: string,
  oldString: string,
  newString: string,
  _replaceAll: boolean,
): PatchResult & { patched?: string } {
  // Strategy 1: Normalize whitespace per line
  const normalizedOld = normalizeWhitespace(oldString);
  const normalizedContent = normalizeWhitespace(content);

  if (normalizedContent.includes(normalizedOld)) {
    // Find the actual range in the original content
    const match = findNormalizedMatch(content, oldString);
    if (match) {
      const patched = content.slice(0, match.start) + newString + content.slice(match.end);
      return {
        success: true,
        patched,
        detail: 'whitespace-normalized match',
      };
    }
  }

  // Strategy 2: Block-anchor matching (first + last line)
  const oldLines = oldString.trim().split('\n');
  if (oldLines.length >= 2) {
    const firstLine = oldLines[0].trim();
    const lastLine = oldLines[oldLines.length - 1].trim();
    const contentLines = content.split('\n');

    let startIdx = -1;
    let endIdx = -1;

    for (let i = 0; i < contentLines.length; i++) {
      if (contentLines[i].trim() === firstLine) {
        startIdx = i;
        break;
      }
    }

    if (startIdx >= 0) {
      for (let i = startIdx + oldLines.length - 1; i < contentLines.length; i++) {
        if (contentLines[i].trim() === lastLine) {
          endIdx = i;
          break;
        }
      }
    }

    if (startIdx >= 0 && endIdx >= startIdx) {
      const matchedBlock = contentLines.slice(startIdx, endIdx + 1).join('\n');
      // Verify the block is similar in size (within 50% tolerance)
      if (Math.abs(matchedBlock.length - oldString.length) < oldString.length * 0.5) {
        const before = contentLines.slice(0, startIdx).join('\n');
        const after = contentLines.slice(endIdx + 1).join('\n');
        const patched = before + (before ? '\n' : '') + newString + (after ? '\n' : '') + after;
        return {
          success: true,
          patched,
          detail: 'block-anchor match (first+last line)',
        };
      }
    }
  }

  // Strategy 3: Near-match hint
  const contentLinesArr = content.split('\n');
  const searchFirst = oldString.trim().split('\n')[0].trim();
  const nearMatches = contentLinesArr
    .map((line, i) => ({ line: line.trim(), num: i + 1 }))
    .filter((l) => l.line.includes(searchFirst))
    .slice(0, 3);

  if (nearMatches.length > 0) {
    const hint = nearMatches
      .map((m) => `  Line ${m.num}: ${m.line.slice(0, 100)}`)
      .join('\n');
    return {
      success: false,
      detail: `Near matches found:\n${hint}`,
    };
  }

  return { success: false, detail: 'No near matches found.' };
}

/**
 * Normalize whitespace: trim each line, collapse multiple spaces.
 */
function normalizeWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .join('\n');
}

/**
 * Find the character range in original content that matches
 * the old string after whitespace normalization.
 */
function findNormalizedMatch(
  content: string,
  oldString: string,
): { start: number; end: number } | null {
  const oldLines = oldString.split('\n').map((l) => l.trim());
  const contentLines = content.split('\n');

  // Find the first line match
  for (let i = 0; i <= contentLines.length - oldLines.length; i++) {
    let matches = true;
    for (let j = 0; j < oldLines.length; j++) {
      if (contentLines[i + j].trim() !== oldLines[j]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      // Calculate character offsets
      let start = 0;
      for (let k = 0; k < i; k++) {
        start += contentLines[k].length + 1; // +1 for \n
      }
      let end = start;
      for (let k = i; k < i + oldLines.length; k++) {
        end += contentLines[k].length + (k < i + oldLines.length - 1 ? 1 : 0);
      }
      return { start, end };
    }
  }

  return null;
}

// ============== Validation ==============

function validateName(name: string): string | null {
  if (!name) return 'Skill name is required.';
  if (name.length > MAX_NAME_LENGTH) return `Name too long (max ${MAX_NAME_LENGTH} chars).`;
  if (!VALID_NAME_RE.test(name)) {
    return `Invalid name "${name}". Must be lowercase alphanumeric with hyphens, dots, or underscores.`;
  }
  return null;
}

function validateCategory(category: string): string | null {
  if (category.length > MAX_NAME_LENGTH) return `Category too long (max ${MAX_NAME_LENGTH} chars).`;
  if (!VALID_NAME_RE.test(category)) {
    return `Invalid category "${category}". Must be lowercase alphanumeric with hyphens, dots, or underscores.`;
  }
  return null;
}

function validateFrontmatter(content: string): string | null {
  const { frontmatter } = parseFrontmatter(content);
  if (!frontmatter.name || typeof frontmatter.name !== 'string') {
    return 'SKILL.md must include "name" in YAML frontmatter.';
  }
  if (!frontmatter.description || typeof frontmatter.description !== 'string') {
    return 'SKILL.md must include "description" in YAML frontmatter.';
  }
  return null;
}

function validateContentSize(content: string, label: string): string | null {
  if (content.length > MAX_SKILL_CONTENT_CHARS) {
    return `${label} too large: ${content.length} chars (max ${MAX_SKILL_CONTENT_CHARS}).`;
  }
  return null;
}

function validateFilePath(filePath: string): string | null {
  if (!filePath) return 'file_path is required.';
  const firstSegment = filePath.split('/')[0];
  if (!ALLOWED_SUBDIRS.has(firstSegment)) {
    return `file_path must start with one of: ${[...ALLOWED_SUBDIRS].join(', ')}`;
  }
  if (filePath.includes('..')) return 'Path traversal (..) is not allowed.';
  return null;
}

// ============== File I/O ==============

/**
 * Check if a skill directory is within the local (writable) skills directory.
 */
function isLocalSkill(skillDir: string, localDir: string): boolean {
  return path.resolve(skillDir).startsWith(path.resolve(localDir));
}

/**
 * Atomically write text to a file using a temp file + rename.
 */
function atomicWriteText(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.tmp.${process.pid}`);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tmpPath, content, 'utf-8');

  try {
    fs.renameSync(tmpPath, filePath);
  } catch {
    // Fallback: direct write if rename fails (cross-device)
    fs.writeFileSync(filePath, content, 'utf-8');
    try { fs.unlinkSync(tmpPath); } catch { /* noop */ }
  }
}
