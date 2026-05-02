/**
 * skill_view tool — Progressive disclosure tier 2/3.
 *
 * Tier 2: Loads the full skill content (prompt + supporting file list).
 * Tier 3: Loads a specific supporting file within a skill.
 *
 * Ported from Python hermes-agent's tools/skills_tool.py:skill_view().
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Type } from '@sinclair/typebox';
import type { TextContent } from '@mariozechner/pi-ai';
import { ALLOWED_SUBDIRS, MAX_SKILL_FILE_BYTES } from './types';
import { findSkillDir, parseSkillContent } from './skill-utils';
import { preprocessSkillContent } from './skill-preprocessing';
import type { PreprocessingConfig } from './types';

export const skillViewSchema = Type.Object({
  name: Type.String({ description: 'Skill name (directory name / slug)' }),
  file_path: Type.Optional(
    Type.String({
      description:
        'Path to a specific supporting file within the skill (e.g. "references/guide.md"). Omit to load the full skill prompt.',
    }),
  ),
});

/**
 * Create a skill_view handler bound to the given skill roots.
 */
export function createSkillViewHandler(
  skillRoots: string[],
  config: {
    preprocessing?: PreprocessingConfig;
    sessionId?: string;
  } = {},
) {
  return async function skillViewHandler(
    _toolCallId: string,
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[]; isError?: boolean }> {
    const name = String(args.name ?? '').trim();
    const filePath = args.file_path ? String(args.file_path).trim() : undefined;

    if (!name) {
      return {
        content: [{ type: 'text', text: 'Error: skill name is required' }],
        isError: true,
      };
    }

    // Find the skill directory
    const skillDir = findSkillDir(name, skillRoots);
    if (!skillDir) {
      return {
        content: [{ type: 'text', text: `Skill "${name}" not found.` }],
        isError: true,
      };
    }

    // Tier 3: Load a specific supporting file
    if (filePath) {
      return loadSupportingFile(skillDir, name, filePath);
    }

    // Tier 2: Load full skill content
    const skill = parseSkillContent(skillDir);
    if (!skill) {
      return {
        content: [{ type: 'text', text: `Failed to parse skill "${name}".` }],
        isError: true,
      };
    }

    // Apply preprocessing
    const processedPrompt = preprocessSkillContent(
      skill.prompt,
      skillDir,
      config.sessionId,
      config.preprocessing,
    );

    // Build response
    const lines: string[] = [];
    lines.push(`# Skill: ${skill.displayName}`);
    if (skill.version) lines.push(`Version: ${skill.version}`);
    if (skill.description) lines.push(`Description: ${skill.description}`);
    lines.push('');
    lines.push(processedPrompt);

    // Append supporting files index
    if (skill.supportingFiles.length > 0) {
      lines.push('');
      lines.push('---');
      lines.push('## Supporting Files');
      lines.push('Use `skill_view` with `file_path` to load any of these:');
      for (const file of skill.supportingFiles) {
        lines.push(`- ${file}`);
      }
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  };
}

/**
 * Load a specific supporting file from a skill directory.
 * Validates the file path stays within allowed subdirectories.
 */
function loadSupportingFile(
  skillDir: string,
  skillName: string,
  filePath: string,
): { content: TextContent[]; isError?: boolean } {
  // Security: validate the file path is within allowed subdirectories
  const firstSegment = filePath.split('/')[0];
  if (!ALLOWED_SUBDIRS.has(firstSegment)) {
    return {
      content: [{
        type: 'text',
        text: `Error: file_path must start with one of: ${[...ALLOWED_SUBDIRS].join(', ')}`,
      }],
      isError: true,
    };
  }

  const fullPath = path.resolve(skillDir, filePath);

  // Security: ensure resolved path is still inside the skill directory
  if (!fullPath.startsWith(path.resolve(skillDir))) {
    return {
      content: [{ type: 'text', text: 'Error: path traversal detected' }],
      isError: true,
    };
  }

  if (!fs.existsSync(fullPath)) {
    return {
      content: [{
        type: 'text',
        text: `File not found: ${filePath} in skill "${skillName}"`,
      }],
      isError: true,
    };
  }

  try {
    const stat = fs.statSync(fullPath);
    if (stat.size > MAX_SKILL_FILE_BYTES) {
      return {
        content: [{
          type: 'text',
          text: `File too large: ${filePath} (${stat.size} bytes, max ${MAX_SKILL_FILE_BYTES})`,
        }],
        isError: true,
      };
    }

    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    return {
      content: [{
        type: 'text',
        text: `# ${skillName} / ${filePath}\n\n${fileContent}`,
      }],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Error reading file: ${msg}` }],
      isError: true,
    };
  }
}
