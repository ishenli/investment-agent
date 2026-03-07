import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillService } from '../skillService';
import { skillRepository } from '../../repository/skillRepository';

// Mock skillRepository
vi.mock('../../repository/skillRepository', () => ({
  skillRepository: {
    findByUserId: vi.fn(),
    findByUserIdAndId: vi.fn(),
    findByUserIdAndSlug: vi.fn(),
    countByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    isSlugExists: vi.fn(),
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
    it('should return skills list with pagination', async () => {
      const mockSkills = [
        {
          id: 1,
          slug: 'test-skill',
          name: 'Test Skill',
          description: 'A test skill',
          category: 'testing',
          source: 'custom',
          isEnabled: true,
          icon: '🧪',
          config: {},
          userId: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockCount = 1;

      (skillRepository.findByUserId as jest.Mock).mockResolvedValue(mockSkills);
      (skillRepository.countByUserId as jest.Mock).mockResolvedValue(mockCount);

      const result = await skillService.getSkills(mockUserId, {
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({
        items: [
          {
            id: 1,
            slug: 'test-skill',
            name: 'Test Skill',
            description: 'A test skill',
            category: 'testing',
            source: 'custom',
            isEnabled: true,
            icon: '🧪',
            config: {},
            createdAt: mockSkills[0].createdAt.toISOString(),
            updatedAt: mockSkills[0].updatedAt.toISOString(),
          },
        ],
        totalCount: 1,
      });

      expect(skillRepository.findByUserId).toHaveBeenCalledWith(mockUserId, {
        limit: 10,
        offset: 0,
      });
      expect(skillRepository.countByUserId).toHaveBeenCalledWith(mockUserId, {});
    });

    it('should handle search parameters', async () => {
      const mockSkills = [];
      const mockCount = 0;

      (skillRepository.findByUserId as jest.Mock).mockResolvedValue(mockSkills);
      (skillRepository.countByUserId as jest.Mock).mockResolvedValue(mockCount);

      await skillService.getSkills(mockUserId, {
        search: 'test',
        category: 'testing',
        source: 'custom',
      });

      expect(skillRepository.findByUserId).toHaveBeenCalledWith(mockUserId, {
        search: 'test',
        category: 'testing',
        source: 'custom',
        limit: 100,
        offset: 0,
      });
      expect(skillRepository.countByUserId).toHaveBeenCalledWith(mockUserId, {
        search: 'test',
        category: 'testing',
        source: 'custom',
      });
    });
  });

  describe('getSkill', () => {
    it('should return a skill by id', async () => {
      const mockSkill = {
        id: 1,
        slug: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        category: 'testing',
        source: 'custom',
        isEnabled: true,
        icon: '🧪',
        config: {},
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (skillRepository.findByUserIdAndId as jest.Mock).mockResolvedValue(mockSkill);

      const result = await skillService.getSkill(mockUserId, 1);

      expect(result).toEqual({
        id: 1,
        slug: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        category: 'testing',
        source: 'custom',
        isEnabled: true,
        icon: '🧪',
        config: {},
        userId: mockUserId,
        createdAt: mockSkill.createdAt,
        updatedAt: mockSkill.updatedAt,
      });
      expect(skillRepository.findByUserIdAndId).toHaveBeenCalledWith(mockUserId, 1);
    });

    it('should return null if skill not found', async () => {
      (skillRepository.findByUserIdAndId as jest.Mock).mockResolvedValue(null);

      const result = await skillService.getSkill(mockUserId, 999);

      expect(result).toBeNull();
    });
  });

  describe('createSkill', () => {
    it('should create a new skill', async () => {
      const createData = {
        slug: 'new-skill',
        name: 'New Skill',
        description: 'A new skill',
        category: 'testing',
        source: 'custom',
        isEnabled: true,
        icon: '🆕',
        config: { test: true },
      };

      const mockSkill = {
        id: 1,
        ...createData,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (skillRepository.isSlugExists as jest.Mock).mockResolvedValue(false);
      (skillRepository.create as jest.Mock).mockResolvedValue(mockSkill);

      const result = await skillService.createSkill(mockUserId, createData);

      expect(result).toEqual({
        id: 1,
        ...createData,
        userId: mockUserId,
        createdAt: mockSkill.createdAt,
        updatedAt: mockSkill.updatedAt,
      });
      expect(skillRepository.isSlugExists).toHaveBeenCalledWith(mockUserId, 'new-skill');
      expect(skillRepository.create).toHaveBeenCalledWith({
        ...createData,
        userId: mockUserId,
      });
    });

    it('should throw error if slug already exists', async () => {
      const createData = {
        slug: 'existing-skill',
        name: 'Existing Skill',
        description: 'An existing skill',
        category: 'testing',
        source: 'custom',
      };

      (skillRepository.isSlugExists as jest.Mock).mockResolvedValue(true);

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
        slug: 'old-slug',
        name: 'Old Name',
        description: 'Old description',
        category: 'testing',
        source: 'custom',
        isEnabled: true,
        icon: '옛',
        config: {},
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        id: 1,
        slug: 'new-slug',
        name: 'New Name',
        description: 'New description',
      };

      const updatedSkill = {
        ...existingSkill,
        ...updateData,
        updatedAt: new Date(),
      };

      (skillRepository.findByUserIdAndId as jest.Mock).mockResolvedValue(existingSkill);
      (skillRepository.isSlugExists as jest.Mock).mockResolvedValue(false);
      (skillRepository.update as jest.Mock).mockResolvedValue(updatedSkill);

      const result = await skillService.updateSkill(mockUserId, 1, updateData);

      expect(result).toEqual({
        id: 1,
        slug: 'new-slug',
        name: 'New Name',
        description: 'New description',
        category: 'testing',
        source: 'custom',
        isEnabled: true,
        icon: '옛',
        config: {},
        userId: mockUserId,
        createdAt: existingSkill.createdAt,
        updatedAt: updatedSkill.updatedAt,
      });
    });

    it('should throw error if skill not found', async () => {
      const updateData = {
        id: 999,
        name: 'New Name',
      };

      (skillRepository.findByUserIdAndId as jest.Mock).mockResolvedValue(null);

      await expect(skillService.updateSkill(mockUserId, 999, updateData))
        .rejects
        .toThrow('Skill not found');
    });
  });

  describe('toggleSkill', () => {
    it('should toggle skill enabled state', async () => {
      const existingSkill = {
        id: 1,
        slug: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        category: 'testing',
        source: 'custom',
        isEnabled: true,
        icon: '🧪',
        config: {},
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedSkill = {
        ...existingSkill,
        isEnabled: false,
        updatedAt: new Date(),
      };

      (skillRepository.update as jest.Mock).mockResolvedValue(updatedSkill);

      const result = await skillService.toggleSkill(mockUserId, {
        id: 1,
        isEnabled: false,
      });

      expect(result).toEqual({
        id: 1,
        slug: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        category: 'testing',
        source: 'custom',
        isEnabled: false,
        icon: '🧪',
        config: {},
        userId: mockUserId,
        createdAt: existingSkill.createdAt,
        updatedAt: updatedSkill.updatedAt,
      });
      expect(skillRepository.update).toHaveBeenCalledWith(mockUserId, 1, {
        isEnabled: false,
      });
    });
  });

  describe('deleteSkill', () => {
    it('should delete a custom skill', async () => {
      const existingSkill = {
        id: 1,
        slug: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        category: 'testing',
        source: 'custom',
        isEnabled: true,
        icon: '🧪',
        config: {},
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (skillRepository.findByUserIdAndId as jest.Mock).mockResolvedValue(existingSkill);
      (skillRepository.delete as jest.Mock).mockResolvedValue(true);

      const result = await skillService.deleteSkill(mockUserId, 1);

      expect(result).toBe(true);
      expect(skillRepository.delete).toHaveBeenCalledWith(mockUserId, 1);
    });

    it('should not delete official skills', async () => {
      const existingSkill = {
        id: 1,
        slug: 'official-skill',
        name: 'Official Skill',
        description: 'An official skill',
        category: 'testing',
        source: 'official',
        isEnabled: true,
        icon: '✅',
        config: {},
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (skillRepository.findByUserIdAndId as jest.Mock).mockResolvedValue(existingSkill);

      await expect(skillService.deleteSkill(mockUserId, 1))
        .rejects
        .toThrow('Cannot delete official skills');

      expect(skillRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('syncBuiltinSkills', () => {
    it('should sync builtin skills', async () => {
      const mockSkills = [
        {
          slug: 'market-analysis',
          name: 'Market Analysis',
          description: 'Analyze market trends',
          category: 'brainstorming',
          source: 'official',
          icon: '📊',
        },
        {
          slug: 'news-analysis',
          name: 'News Analysis',
          description: 'Analyze financial news',
          category: 'brainstorming',
          source: 'official',
          icon: '📰',
        },
        {
          slug: 'risk-assessment',
          name: 'Risk Assessment',
          description: 'Assess investment risks',
          category: 'debugging',
          source: 'official',
          icon: '⚠️',
        },
        {
          slug: 'portfolio-optimization',
          name: 'Portfolio Optimization',
          description: 'Optimize portfolio allocation',
          category: 'optimization',
          source: 'official',
          icon: '📈',
        },
      ];

      // Mock that all skills don't exist initially
      (skillRepository.findByUserIdAndSlug as jest.Mock).mockResolvedValue(null);
      
      // Mock create to return something
      (skillRepository.create as jest.Mock).mockResolvedValue({});

      const result = await skillService.syncBuiltinSkills(mockUserId);

      expect(result).toBe(5); // All 5 skills should be created
      expect(skillRepository.create).toHaveBeenCalledTimes(5);
    });
  });
});