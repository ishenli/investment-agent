import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@server/service/agentModelResolver', () => ({
  resolveAgentModel: vi.fn().mockResolvedValue({
    model: { api: {}, contextWindow: 0 },
    apiKey: '',
  }),
}));

vi.mock('@server/lib/skill/SkillFileScanner', () => ({
  skillFileScanner: {
    getSkillRoots: vi.fn().mockReturnValue(['/user/skills', '/global/skills']),
    ensureSkillsRoot: vi.fn().mockReturnValue('/local/skills'),
  },
}));

vi.mock('@server/lib/skill/SkillRegistry', () => ({
  skillRegistry: {
    getEnabledSkills: vi.fn().mockResolvedValue([
      { id: 'skill-a', name: 'Skill A', isEnabled: true },
    ]),
  },
}));

vi.mock('@server/core/agents/hermes', () => ({
  registerBusinessTools: vi.fn(),
}));

vi.mock('@investment-agent/hermes-agent', async () => {
  const actual = await vi.importActual<any>('@investment-agent/hermes-agent');
  return {
    ...actual,
    registerBuiltinTools: vi.fn(),
    registerSkillTools: vi.fn(),
    HermesAgent: vi.fn().mockImplementation(() => ({
      run: vi.fn().mockResolvedValue({
        context: { messages: [], systemPrompt: '', tools: [] },
        completed: true,
        apiCalls: 1,
        finalResponse: 'Done',
      }),
      getSystemPrompt: vi.fn().mockReturnValue(''),
      name: 'hermes',
    })),
  };
});

import { HermesEngine } from '../engine';
import { registerSkillTools } from '@investment-agent/hermes-agent';

describe('HermesEngine skill registration', () => {
  it('registers skill tools with reversed roots and enabledSlugs when enableTools is true', async () => {
    const engine = new HermesEngine();
    const emitter: any = {
      sendStatus: vi.fn(),
      sendTextDelta: vi.fn(),
      sendToolUseEvent: vi.fn(),
      sendResult: vi.fn(),
    };

    await engine.run(
      {
        model: 'test-model',
        messages: [{ role: 'user', content: 'hi', timestamp: Date.now() }],
        systemPrompt: '',
        signal: new AbortController().signal,
        messageId: 'msg-1',
        userId: 42,
        extra: { enableTools: true },
      } as any,
      emitter,
    );

    expect(registerSkillTools).toHaveBeenCalledTimes(1);
    const [, config] = vi.mocked(registerSkillTools).mock.calls[0] as any;
    expect(config.skillRoots).toEqual(['/global/skills', '/user/skills']);
    expect(config.localSkillsDir).toBe('/local/skills');
    expect(config.sessionId).toBe('42');
    expect(config.enabledSlugs).toEqual(['skill-a']);
  });
});
