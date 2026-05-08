import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillService } from '../skillService';
import { skillRepository } from '../../repository/skillRepository';
import { skillRegistry } from '../../lib/skill/SkillRegistry';
import { skillInstaller } from '../../lib/skill/SkillInstaller';

// Mock drizzle schema first (required by modelProviderRepository)
vi.mock('@/drizzle/schema', () => ({
  modelProviders: {},
  providerModels: {},
  skills: {},
}));

// Mock dependencies
vi.mock('../../repository/skillRepository', () => ({
  skillRepository: {
    findByUserId: vi.fn(),
    findByUserIdAndId: vi.fn(),
    findByUserIdAndSlug: vi.fn(),
    countByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateBySlug: vi.fn(),
    delete: vi.fn(),
    deleteBySlug: vi.fn(),
    isSlugExists: vi.fn(),
    updateContentHash: vi.fn(),
    updateDeployedHash: vi.fn(),
  },
}));

vi.mock('../../lib/skill/SkillRegistry', () => ({
  skillRegistry: {
    getSkills: vi.fn(),
    getBySlug: vi.fn(),
    getEnabledSkills: vi.fn(),
    getSkillsBySlugs: vi.fn(),
    toggle: vi.fn(),
    invalidate: vi.fn(),
  },
}));

vi.mock('../../lib/skill/SkillInstaller', () => ({
  skillInstaller: {
    createCustomSkill: vi.fn(),
    updateCustomSkillFiles: vi.fn(),
    deleteCustomSkillFiles: vi.fn(),
    install: vi.fn(),
  },
}));

vi.mock('../../lib/skill/SkillFileScanner', () => ({
  SkillFileScanner: class {
    scan = vi.fn(() => []);
    scanForUser = vi.fn(() => []);
    getSkillRoots = vi.fn(() => []);
    loadSkillsDefaults = vi.fn(() => ({}));
    ensureUserSkillsRoot = vi.fn(() => '/tmp/skills');
    getUserSkillsRoot = vi.fn(() => '/tmp/skills');
  },
  skillFileScanner: {
    scan: vi.fn(() => []),
    scanForUser: vi.fn(() => []),
    getSkillRoots: vi.fn(() => []),
    loadSkillsDefaults: vi.fn(() => ({})),
    ensureUserSkillsRoot: vi.fn(() => '/tmp/skills'),
    getUserSkillsRoot: vi.fn(() => '/tmp/skills'),
  },
  SKILL_FILE_NAME: 'SKILL.md',
  SKILLS_CONFIG_FILE: 'skills.config.json',
  listSkillDirs: vi.fn(() => []),
  parseFrontmatter: vi.fn(() => ({ frontmatter: {}, content: '' })),
  collectSkillDirsFromSource: vi.fn(() => []),
}));

vi.mock('../../service/claudeService', () => ({
  default: {
    getUserWorkspaceRoot: vi.fn(() => '/tmp/workspace'),
  },
}));

describe('SkillService', () => {
  let skillService: SkillService;
  const mockUserId = 1;

  beforeEach(() => {
    skillService = new SkillService();
    vi.clearAllMocks();
  });

  describe('getSkills', () => {
    it('should return skills list from registry', async () => {
      const mockSkills = [
        {
          id: 0,
          slug: 'test-skill',
          name: 'Test Skill',
          description: 'A test skill',
          version: '1.0.0',
          source: 'custom',
          isEnabled: true,
          isOfficial: false,
          isBuiltIn: false,
          icon: null,
          skillPath: '/path/to/skill',
          updatedAt: '2026-01-01T00:00:00.000Z',
          dbId: 1,
        },
      ];

      (skillRegistry.getSkills as ReturnType<typeof vi.fn>).mockResolvedValue({
        skills: mockSkills,
        totalCount: 1,
      });

      const result = await skillService.getSkills(mockUserId, {
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({
        skills: mockSkills,
        totalCount: 1,
      });
      expect(skillRegistry.getSkills).toHaveBeenCalledWith(mockUserId, {
        limit: 10,
        offset: 0,
      });
    });

    it('should pass search and source parameters to registry', async () => {
      (skillRegistry.getSkills as ReturnType<typeof vi.fn>).mockResolvedValue({
        skills: [],
        totalCount: 0,
      });

      await skillService.getSkills(mockUserId, {
        search: 'test',
        source: 'custom',
      });

      expect(skillRegistry.getSkills).toHaveBeenCalledWith(mockUserId, {
        search: 'test',
        source: 'custom',
      });
    });
  });

  describe('getSkill', () => {
    it('should return a skill by slug', async () => {
      const mockSkill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        prompt: 'Test prompt',
        isOfficial: false,
        isBuiltIn: false,
        updatedAt: Date.now(),
        skillPath: '/path/to/skill',
        dbId: 1,
        isEnabled: true,
        source: 'custom',
        category: 'other',
        icon: null,
      };

      (skillRegistry.getBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(mockSkill);

      const result = await skillService.getSkill(mockUserId, 'test-skill');

      expect(result).toEqual(mockSkill);
      expect(skillRegistry.getBySlug).toHaveBeenCalledWith(mockUserId, 'test-skill');
    });

    it('should return null if skill not found', async () => {
      (skillRegistry.getBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await skillService.getSkill(mockUserId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getEnabledSkills', () => {
    it('should return enabled skills from registry', async () => {
      const mockSkills = [
        {
          id: 'enabled-skill',
          name: 'Enabled Skill',
          description: 'An enabled skill',
          prompt: 'Test prompt',
          isEnabled: true,
        },
      ];

      (skillRegistry.getEnabledSkills as ReturnType<typeof vi.fn>).mockResolvedValue(mockSkills);

      const result = await skillService.getEnabledSkills(mockUserId);

      expect(result).toEqual(mockSkills);
      expect(skillRegistry.getEnabledSkills).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('createSkill', () => {
    it('should create a new skill with SKILL.md', async () => {
      const createData = {
        slug: 'new-skill',
        name: 'New Skill',
        description: 'A new skill',
        prompt: 'Test prompt',
        isEnabled: true,
      };

      const createdSkill = {
        id: 1,
        slug: 'new-skill',
        source: 'custom',
        isEnabled: true,
        icon: null,
        userId: mockUserId,
        updatedAt: new Date(),
      };

      (skillRepository.isSlugExists as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (skillRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(createdSkill);

      const result = await skillService.createSkill(mockUserId, createData);

      expect(result).toEqual(createdSkill);
      expect(skillInstaller.createCustomSkill).toHaveBeenCalledWith(
        'new-skill',
        expect.stringContaining('New Skill'),
        mockUserId,
      );
      expect(skillRegistry.invalidate).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw error if slug already exists', async () => {
      const createData = {
        slug: 'existing-skill',
        name: 'Existing Skill',
        description: 'Already exists',
        prompt: 'Test prompt',
      };

      (skillRepository.isSlugExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await expect(skillService.createSkill(mockUserId, createData))
        .rejects
        .toThrow('Skill slug already exists');

      expect(skillRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateSkill', () => {
    it('should update an existing skill', async () => {
      const existingSkill = {
        id: 1,
        slug: 'test-skill',
        source: 'custom',
        isEnabled: true,
        icon: null,
        userId: mockUserId,
        updatedAt: new Date(),
      };

      const updateData = {
        slug: 'test-skill',
        name: 'Updated Name',
        description: 'Updated description',
        isEnabled: false,
      };

      const updatedSkill = {
        ...existingSkill,
        isEnabled: false,
        updatedAt: new Date(),
      };

      (skillRepository.findByUserIdAndSlug as ReturnType<typeof vi.fn>).mockResolvedValue(existingSkill);
      (skillRepository.updateBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(updatedSkill);

      const result = await skillService.updateSkill(mockUserId, 'test-skill', updateData);

      expect(result).toEqual(updatedSkill);
      expect(skillRegistry.invalidate).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw error if skill not found', async () => {
      (skillRepository.findByUserIdAndSlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(skillService.updateSkill(mockUserId, 'nonexistent', { slug: 'nonexistent' }))
        .rejects
        .toThrow('Skill not found');
    });
  });

  describe('toggleSkill', () => {
    it('should toggle skill enabled state by slug', async () => {
      const mockSkill = {
        id: 1,
        slug: 'test-skill',
        source: 'custom',
        isEnabled: false,
        icon: null,
        userId: mockUserId,
        updatedAt: new Date(),
      };

      (skillRegistry.toggle as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (skillRepository.findByUserIdAndSlug as ReturnType<typeof vi.fn>).mockResolvedValue(mockSkill);

      const result = await skillService.toggleSkill(mockUserId, {
        slug: 'test-skill',
        isEnabled: false,
      });

      expect(result).toEqual(mockSkill);
      expect(skillRegistry.toggle).toHaveBeenCalledWith(mockUserId, 'test-skill', false);
    });
  });

  describe('deleteSkill', () => {
    it('should delete a custom skill', async () => {
      const existingSkill = {
        id: 1,
        slug: 'test-skill',
        source: 'custom',
        isEnabled: true,
        icon: null,
        userId: mockUserId,
        updatedAt: new Date(),
      };

      (skillRepository.findByUserIdAndSlug as ReturnType<typeof vi.fn>).mockResolvedValue(existingSkill);
      (skillRepository.deleteBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (skillInstaller.deleteCustomSkillFiles as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const result = await skillService.deleteSkill(mockUserId, 'test-skill');

      expect(result).toBe(true);
      expect(skillInstaller.deleteCustomSkillFiles).toHaveBeenCalledWith('test-skill', mockUserId);
      expect(skillRepository.deleteBySlug).toHaveBeenCalledWith(mockUserId, 'test-skill');
      expect(skillRegistry.invalidate).toHaveBeenCalledWith(mockUserId);
    });

    it('should not delete official skills', async () => {
      const existingSkill = {
        id: 1,
        slug: 'official-skill',
        source: 'official',
        isEnabled: true,
        icon: null,
        userId: mockUserId,
        updatedAt: new Date(),
      };

      (skillRepository.findByUserIdAndSlug as ReturnType<typeof vi.fn>).mockResolvedValue(existingSkill);

      await expect(skillService.deleteSkill(mockUserId, 'official-skill'))
        .rejects
        .toThrow('Cannot delete official skills');

      expect(skillRepository.deleteBySlug).not.toHaveBeenCalled();
    });
  });

  describe('syncBuiltinSkills', () => {
    it('should sync skills from filesystem', async () => {
      // Mock filesystem skills
      const mockParsedSkills = [
        { id: 'skill-1', name: 'Skill 1', description: 'Desc 1', isOfficial: true, isBuiltIn: true },
        { id: 'skill-2', name: 'Skill 2', description: 'Desc 2', isOfficial: true, isBuiltIn: true },
      ];

      const { skillFileScanner } = await import('../../lib/skill/SkillFileScanner');
      vi.mocked(skillFileScanner.scanForUser).mockReturnValue(mockParsedSkills as any);

      // Mock no existing preferences
      (skillRepository.findByUserIdAndSlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (skillRepository.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (skillRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (skillRepository.updateContentHash as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (skillRepository.updateDeployedHash as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await skillService.syncBuiltinSkills(mockUserId);

      expect(result.created).toBe(2);
      expect(result.pruned).toBe(0);
    });
  });
});
