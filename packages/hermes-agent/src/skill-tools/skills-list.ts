/**
 * skills_list tool — Progressive disclosure tier 1.
 *
 * Lists all available skills with lightweight metadata only (~100 tokens/skill).
 * The agent uses this as an index before loading full skill content via skill_view.
 *
 * Ported from Python hermes-agent's tools/skills_tool.py:skills_list().
 */

import { Type } from '@sinclair/typebox';
import type { TextContent } from '@mariozechner/pi-ai';
import type { SkillMetadata, SkillScanOptions } from './types';
import { scanSkills } from './skill-utils';

export const skillsListSchema = Type.Object({
  category: Type.Optional(
    Type.String({ description: 'Filter by category name (case-insensitive)' }),
  ),
});

/**
 * Create a skills_list handler bound to the given skill roots.
 */
export function createSkillsListHandler(skillRoots: string[], enabledSlugs?: string[]) {
  const enabledSet = enabledSlugs ? new Set(enabledSlugs) : undefined;

  return async function skillsListHandler(
    _toolCallId: string,
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[]; isError?: boolean }> {
    const category = args.category ? String(args.category).toLowerCase() : undefined;

    const options: SkillScanOptions = {
      category,
      filterPlatform: true,
    };

    let skills: SkillMetadata[] = scanSkills(skillRoots, options);
    if (enabledSet) {
      skills = skills.filter((s) => enabledSet.has(s.name));
    }

    if (skills.length === 0) {
      const msg = category
        ? `No skills found in category "${category}".`
        : 'No skills available.';
      return { content: [{ type: 'text', text: msg }] };
    }

    // Format as compact index for token efficiency
    const grouped = groupByCategory(skills);
    const lines: string[] = [`Found ${skills.length} skill(s):\n`];

    for (const [cat, catSkills] of Object.entries(grouped)) {
      lines.push(`## ${cat || 'Uncategorized'}`);
      for (const skill of catSkills) {
        const version = skill.version ? ` (v${skill.version})` : '';
        const official = skill.isOfficial ? ' [official]' : '';
        lines.push(`- **${skill.name}**${version}${official}: ${skill.description}`);
      }
      lines.push('');
    }

    lines.push('Use `skill_view` with the skill name to load full instructions.');

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  };
}

function groupByCategory(skills: SkillMetadata[]): Record<string, SkillMetadata[]> {
  const grouped: Record<string, SkillMetadata[]> = {};
  for (const skill of skills) {
    const cat = skill.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(skill);
  }
  return grouped;
}
