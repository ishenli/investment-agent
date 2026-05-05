import { describe, it, expect } from 'vitest';
import { INVESTMENT_ASSISTANT_SYSTEM_PROMPT, SKILLS_GUIDANCE } from '../agentPrompts';

describe('agentPrompts', () => {
  it('includes skills guidance in the system prompt', () => {
    expect(INVESTMENT_ASSISTANT_SYSTEM_PROMPT).toContain(SKILLS_GUIDANCE);
  });

  it('mentions skill discovery tools', () => {
    expect(INVESTMENT_ASSISTANT_SYSTEM_PROMPT).toContain('skills_list');
    expect(INVESTMENT_ASSISTANT_SYSTEM_PROMPT).toContain('skill_view');
    expect(INVESTMENT_ASSISTANT_SYSTEM_PROMPT).toContain('skill_manage');
  });
});
