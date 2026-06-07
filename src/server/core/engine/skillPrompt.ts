/**
 * Shared utility for building explicit skill prompt directives.
 *
 * Used by both Claude route and Hermes engine to inject a user-selected
 * skill into the prompt (not systemPrompt) to preserve prompt cache.
 */

interface SkillForPrompt {
  name: string;
  description: string;
  prompt: string;
}

export function buildExplicitSkillPrompt(skill: SkillForPrompt): string {
  return [
    '# 用户显式指定的技能（本次对话优先使用）',
    `<skills>\n<skill name="${skill.name}">`,
    `<description>${skill.description.replace(/"/g, '&quot;')}</description>`,
    skill.prompt,
    `</skill>\n</skills>`,
  ].join('\n');
}
