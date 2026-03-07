import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteService, CreateNoteRequestType, UpdateNoteRequestType } from '../noteService';

// Mock repository before importing
vi.mock('@server/repository/noteRepository', () => ({
  noteRepository: {
    create: vi.fn(),
    findByUserId: vi.fn(),
    findByIdAndUserId: vi.fn(),
    updateByIdAndUserId: vi.fn(),
    deleteByIdAndUserId: vi.fn(),
    deleteByUserIdAndIds: vi.fn(),
    findUserTags: vi.fn(),
    searchByUserIdAndContent: vi.fn(),
  },
}));

vi.mock('@server/service/authService', () => ({
  default: {
    getCurrentUserId: vi.fn(),
  },
}));

import { noteRepository } from '@server/repository/noteRepository';
import authService from '../authService';

const mockNoteEntity = {
  id: 1,
  userId: 1,
  title: 'Test Note',
  content: 'Test content',
  tags: ['tag1', 'tag2'],
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('NoteService', () => {
  let noteService: NoteService;

  beforeEach(() => {
    noteService = new NoteService();
    vi.clearAllMocks();
  });

  describe('createNote', () => {
    it('应该成功创建新笔记', async () => {
      const request: CreateNoteRequestType = {
        userId: '1',
        title: 'New Note',
        content: 'Note content',
        tags: ['development', 'test'],
      };

      vi.mocked(noteRepository.create).mockResolvedValue({
        ...mockNoteEntity,
        id: 2,
        title: 'New Note',
        content: 'Note content',
        tags: ['development', 'test'],
      });

      const result = await noteService.createNote(request);

      expect(result).not.toBeNull();
      expect(result.userId).toBe('1');
      expect(result.title).toBe('New Note');
      expect(result.content).toBe('Note content');
      expect(result.tags).toEqual(['development', 'test']);
      expect(noteRepository.create).toHaveBeenCalledWith({
        userId: 1,
        title: 'New Note',
        content: 'Note content',
        tags: ['development', 'test'],
      });
    });

    it('数据库错误时应该抛出错误', async () => {
      const request: CreateNoteRequestType = {
        userId: '1',
        title: 'New Note',
        content: 'Note content',
        tags: [],
      };

      vi.mocked(noteRepository.create).mockRejectedValue(new Error('Database error'));

      await expect(noteService.createNote(request)).rejects.toThrow();
    });
  });

  describe('getUserNotes', () => {
    it('应该返回用户的笔记列表', async () => {
      vi.mocked(noteRepository.findByUserId).mockResolvedValue({
        items: [mockNoteEntity],
        totalCount: 1,
      });

      const result = await noteService.getUserNotes('1', 20, 0);

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.items[0].id).toBe('1');
      expect(result.items[0].title).toBe('Test Note');
    });

    it('应该支持搜索功能', async () => {
      vi.mocked(noteRepository.findByUserId).mockResolvedValue({
        items: [mockNoteEntity],
        totalCount: 1,
      });

      const result = await noteService.getUserNotes('1', 20, 0, 'createdAt', 'desc', 'search');

      expect(result.items).toHaveLength(1);
      expect(noteRepository.findByUserId).toHaveBeenCalledWith(1, {
        limit: 20,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        search: 'search',
        tag: undefined,
      });
    });

    it('应该支持标签筛选', async () => {
      vi.mocked(noteRepository.findByUserId).mockResolvedValue({
        items: [mockNoteEntity],
        totalCount: 1,
      });

      const result = await noteService.getUserNotes('1', 20, 0, 'createdAt', 'desc', undefined, 'tag1');

      expect(result.items).toHaveLength(1);
      expect(noteRepository.findByUserId).toHaveBeenCalledWith(1, {
        limit: 20,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        search: undefined,
        tag: 'tag1',
      });
    });

    it('数据库错误时应该返回空列表', async () => {
      vi.mocked(noteRepository.findByUserId).mockRejectedValue(new Error('Database error'));

      const result = await noteService.getUserNotes('1');

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getNote', () => {
    it('应该返回指定笔记', async () => {
      vi.mocked(noteRepository.findByIdAndUserId).mockResolvedValue(mockNoteEntity);

      const result = await noteService.getNote('1', '1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.title).toBe('Test Note');
    });

    it('笔记不存在时应该返回 null', async () => {
      vi.mocked(noteRepository.findByIdAndUserId).mockResolvedValue(null);

      const result = await noteService.getNote('999', '1');

      expect(result).toBeNull();
    });

    it('数据库错误时应该返回 null', async () => {
      vi.mocked(noteRepository.findByIdAndUserId).mockRejectedValue(new Error('Database error'));

      const result = await noteService.getNote('1', '1');

      expect(result).toBeNull();
    });
  });

  describe('updateNote', () => {
    it('应该成功更新笔记', async () => {
      const request: UpdateNoteRequestType = {
        title: 'Updated Note',
        content: 'Updated content',
      };

      vi.mocked(noteRepository.updateByIdAndUserId).mockResolvedValue({
        ...mockNoteEntity,
        title: 'Updated Note',
        content: 'Updated content',
      });

      const result = await noteService.updateNote('1', '1', request);

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Updated Note');
      expect(result?.content).toBe('Updated content');
    });

    it('笔记不存在时应该返回 null', async () => {
      const request: UpdateNoteRequestType = {
        title: 'Updated Note',
      };

      vi.mocked(noteRepository.updateByIdAndUserId).mockResolvedValue(null);

      const result = await noteService.updateNote('999', '1', request);

      expect(result).toBeNull();
    });

    it('数据库错误时应该返回 null', async () => {
      const request: UpdateNoteRequestType = {
        title: 'Updated Note',
      };

      vi.mocked(noteRepository.updateByIdAndUserId).mockRejectedValue(new Error('Database error'));

      const result = await noteService.updateNote('1', '1', request);

      expect(result).toBeNull();
    });
  });

  describe('deleteNote', () => {
    it('应该成功删除笔记', async () => {
      vi.mocked(noteRepository.deleteByIdAndUserId).mockResolvedValue(true);

      const result = await noteService.deleteNote('1', '1');

      expect(result).toBe(true);
    });

    it('删除失败时应该返回 false', async () => {
      vi.mocked(noteRepository.deleteByIdAndUserId).mockResolvedValue(false);

      const result = await noteService.deleteNote('999', '1');

      expect(result).toBe(false);
    });

    it('数据库错误时应该返回 false', async () => {
      vi.mocked(noteRepository.deleteByIdAndUserId).mockRejectedValue(new Error('Database error'));

      const result = await noteService.deleteNote('1', '1');

      expect(result).toBe(false);
    });
  });

  describe('deleteNotes', () => {
    it('应该成功批量删除笔记', async () => {
      vi.mocked(noteRepository.deleteByUserIdAndIds).mockResolvedValue(true);

      const result = await noteService.deleteNotes(['1', '2', '3'], '1');

      expect(result).toBe(true);
      expect(noteRepository.deleteByUserIdAndIds).toHaveBeenCalledWith(1, [1, 2, 3]);
    });

    it('数据库错误时应该返回 false', async () => {
      vi.mocked(noteRepository.deleteByUserIdAndIds).mockRejectedValue(new Error('Database error'));

      const result = await noteService.deleteNotes(['1'], '1');

      expect(result).toBe(false);
    });
  });

  describe('getUserTags', () => {
    it('应该返回用户的所有标签', async () => {
      vi.mocked(noteRepository.findUserTags).mockResolvedValue(['tag1', 'tag2', 'tag3']);

      const result = await noteService.getUserTags('1');

      expect(result).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
      expect(result).toHaveLength(3);
    });

    it('没有笔记时应该返回空数组', async () => {
      vi.mocked(noteRepository.findUserTags).mockResolvedValue([]);

      const result = await noteService.getUserTags('1');

      expect(result).toHaveLength(0);
    });

    it('数据库错误时应该返回空数组', async () => {
      vi.mocked(noteRepository.findUserTags).mockRejectedValue(new Error('Database error'));

      const result = await noteService.getUserTags('1');

      expect(result).toHaveLength(0);
    });
  });

  describe('searchNotes', () => {
    it('应该搜索用户的笔记', async () => {
      vi.mocked(authService.getCurrentUserId).mockResolvedValue('1');
      vi.mocked(noteRepository.searchByUserIdAndContent).mockResolvedValue([mockNoteEntity]);

      const result = await noteService.searchNotes('content');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Note');
    });

    it('用户未登录时应该返回空数组', async () => {
      vi.mocked(authService.getCurrentUserId).mockResolvedValue('');

      const result = await noteService.searchNotes('content');

      expect(result).toHaveLength(0);
    });

    it('数据库错误时应该返回空数组', async () => {
      vi.mocked(authService.getCurrentUserId).mockResolvedValue('1');
      vi.mocked(noteRepository.searchByUserIdAndContent).mockRejectedValue(new Error('Database error'));

      const result = await noteService.searchNotes('content');

      expect(result).toHaveLength(0);
    });
  });
});