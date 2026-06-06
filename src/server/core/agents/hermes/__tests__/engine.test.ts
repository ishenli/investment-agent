import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@server/service/agentModelResolver', () => ({
  resolveAgentModel: vi.fn().mockResolvedValue({
    model: { api: {}, contextWindow: 0 },
    apiKey: '',
  }),
}));

vi.mock('@server/lib/skill/SkillFileScanner', () => ({
  SkillFileScanner: class {
    getSkillRoots = vi.fn().mockReturnValue(['/user/skills', '/global/skills']);
    ensureSkillsRoot = vi.fn().mockReturnValue('/local/skills');
    ensureUserSkillsRoot = vi.fn().mockReturnValue('/local/skills');
    getUserSkillsRoot = vi.fn().mockReturnValue('/local/skills');
    scan = vi.fn().mockReturnValue([]);
    scanForUser = vi.fn().mockReturnValue([]);
    loadSkillsDefaults = vi.fn().mockReturnValue({});
  },
  skillFileScanner: {
    getSkillRoots: vi.fn().mockReturnValue(['/user/skills', '/global/skills']),
    ensureSkillsRoot: vi.fn().mockReturnValue('/local/skills'),
    ensureUserSkillsRoot: vi.fn().mockReturnValue('/local/skills'),
    getUserSkillsRoot: vi.fn().mockReturnValue('/local/skills'),
    scan: vi.fn().mockReturnValue([]),
    scanForUser: vi.fn().mockReturnValue([]),
    loadSkillsDefaults: vi.fn().mockReturnValue({}),
  },
  SKILL_FILE_NAME: 'SKILL.md',
  SKILLS_CONFIG_FILE: 'skills.config.json',
  listSkillDirs: vi.fn().mockReturnValue([]),
  parseFrontmatter: vi.fn().mockReturnValue({ frontmatter: {}, content: '' }),
  collectSkillDirsFromSource: vi.fn().mockReturnValue([]),
}));

vi.mock('@server/lib/skill/SkillRegistry', () => ({
  skillRegistry: {
    getEnabledSkills: vi.fn().mockResolvedValue([
      { id: 'skill-a', name: 'Skill A', isEnabled: true },
    ]),
  },
}));

vi.mock('@server/service/skillService', () => ({
  skillService: {
    getSkill: vi.fn().mockResolvedValue(null),
    ensureSkillRecord: vi.fn(),
    syncDeployment: vi.fn(),
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
import { registerSkillTools, HermesAgent } from '@investment-agent/hermes-agent';
import { skillService } from '@server/service/skillService';

const makeCtx = (overrides: Record<string, any> = {}) => ({
  model: 'test-model',
  messages: [{ role: 'user', content: 'hello', timestamp: Date.now() }],
  systemPrompt: 'base system prompt',
  signal: new AbortController().signal,
  messageId: 'msg-1',
  userId: 42,
  extra: { enableTools: true },
  ...overrides,
} as any);

const makeEmitter = () => ({
  sendStatus: vi.fn(),
  sendTextDelta: vi.fn(),
  sendToolUseEvent: vi.fn(),
  sendResult: vi.fn(),
} as any);

describe('HermesEngine skill registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

describe('HermesEngine explicit skill injection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prepends explicit skill directive to the message passed to agent.run()', async () => {
    vi.mocked(skillService.getSkill).mockResolvedValue({
      id: 'risk-assessment',
      name: 'Risk Assessment',
      description: 'Evaluate investment risk',
      prompt: 'You are a risk analyst. Assess the risk.',
      isEnabled: true,
    } as any);

    const engine = new HermesEngine();
    await engine.run(
      makeCtx({ extra: { enableTools: true, explicitSkill: 'risk-assessment' } }),
      makeEmitter(),
    );

    const agentInstance = vi.mocked(HermesAgent).mock.results[0].value;
    const runCall = agentInstance.run.mock.calls[0][0];
    expect(runCall.message).toContain('用户显式指定的技能（本次对话优先使用）');
    expect(runCall.message).toContain('<skill name="Risk Assessment">');
    expect(runCall.message).toContain('You are a risk analyst. Assess the risk.');
    expect(runCall.message).toContain('hello');
  });

  it('leaves message unchanged when explicitSkill is not provided', async () => {
    const engine = new HermesEngine();
    await engine.run(makeCtx(), makeEmitter());

    const agentInstance = vi.mocked(HermesAgent).mock.results[0].value;
    const runCall = agentInstance.run.mock.calls[0][0];
    expect(runCall.message).toBe('hello');
  });

  it('leaves message unchanged when skill has no prompt', async () => {
    vi.mocked(skillService.getSkill).mockResolvedValue({
      id: 'no-prompt-skill',
      name: 'No Prompt',
      description: 'A skill without prompt',
      prompt: '',
      isEnabled: true,
    } as any);

    const engine = new HermesEngine();
    await engine.run(
      makeCtx({ extra: { enableTools: true, explicitSkill: 'no-prompt-skill' } }),
      makeEmitter(),
    );

    const agentInstance = vi.mocked(HermesAgent).mock.results[0].value;
    const runCall = agentInstance.run.mock.calls[0][0];
    expect(runCall.message).toBe('hello');
  });

  it('leaves message unchanged when skill is not found', async () => {
    vi.mocked(skillService.getSkill).mockResolvedValue(null);

    const engine = new HermesEngine();
    await engine.run(
      makeCtx({ extra: { enableTools: true, explicitSkill: 'nonexistent' } }),
      makeEmitter(),
    );

    const agentInstance = vi.mocked(HermesAgent).mock.results[0].value;
    const runCall = agentInstance.run.mock.calls[0][0];
    expect(runCall.message).toBe('hello');
  });

  it('does not modify systemPrompt when explicitSkill is provided', async () => {
    vi.mocked(skillService.getSkill).mockResolvedValue({
      id: 'risk-assessment',
      name: 'Risk Assessment',
      description: 'Evaluate risk',
      prompt: 'Risk prompt content',
      isEnabled: true,
    } as any);

    const engine = new HermesEngine();
    await engine.run(
      makeCtx({ extra: { enableTools: true, explicitSkill: 'risk-assessment' } }),
      makeEmitter(),
    );

    const agentCtor = vi.mocked(HermesAgent).mock.calls[0][0] as any;
    expect(agentCtor.systemPrompt).toBe('base system prompt');
  });
});
