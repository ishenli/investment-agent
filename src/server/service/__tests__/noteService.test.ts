import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteService, CreateNoteRequestType, UpdateNoteRequestType } from '../noteService';

// Mock @server/lib/db before importing noteService
vi.mock('@server/lib/db', () => ({
  db: {
    query: {
      notes: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({ from: vi.fn() })),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@server/service/authService', () => ({
  default: {
    getCurrentUserId: vi.fn(),
  },
}));

import { db } from '../../lib/db';
import authService from '../authService';

const mockNote = {
  id: 1,
  userId: 1,
  title: 'Test Note',
  content: 'Test content',
  tags: ['tag1', 'tag2'],
  createdAt: new Date(),
  updatedAt: new Date(),
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

      const mockReturning = vi.fn().mockResolvedValue([
        {
          id: 2,
          userId: 1,
          title: 'New Note',
          content: 'Note content',
          tags: ['development', 'test'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });

      const result = await noteService.createNote(request);

      expect(result).not.toBeNull();
      expect(result.userId).toBe('1');
      expect(result.title).toBe('New Note');
      expect(result.content).toBe('Note content');
      expect(result.tags).toEqual(['development', 'test']);
    });

    it('数据库错误时应该抛出错误', async () => {
      const request: CreateNoteRequestType = {
        userId: '1',
        title: 'New Note',
        content: 'Note content',
        tags: [],
      };

      const mockValues = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      (db.insert as any).mockReturnValue({ values: mockValues });

      await expect(noteService.createNote(request)).rejects.toThrow();
    });
  });

  describe('getUserNotes', () => {
    it('应该返回用户的笔记列表', async () => {
      (db.query.notes.findMany as any).mockResolvedValue([mockNote]);

      // Mock db.select().from().where() chain for count
      const mockWhere = vi.fn().mockResolvedValue([{ count: 1 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await noteService.getUserNotes('1', 20, 0);

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.items[0].id).toBe('1');
      expect(result.items[0].title).toBe('Test Note');
    });

    it('应该支持搜索功能', async () => {
      (db.query.notes.findMany as any).mockResolvedValue([mockNote]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 1 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await noteService.getUserNotes('1', 20, 0, 'createdAt', 'desc', 'search');

      expect(result.items).toHaveLength(1);
    });

    it('应该支持标签筛选', async () => {
      (db.query.notes.findMany as any).mockResolvedValue([mockNote]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 1 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await noteService.getUserNotes('1', 20, 0, 'createdAt', 'desc', undefined, 'tag1');

      expect(result.items).toHaveLength(1);
    });

    it('数据库错误时应该返回空列表', async () => {
      (db.query.notes.findMany as any).mockRejectedValue(new Error('Database error'));

      const mockWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await noteService.getUserNotes('1');

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getNote', () => {
    it('应该返回指定笔记', async () => {
      (db.query.notes.findFirst as any).mockResolvedValue(mockNote);

      const result = await noteService.getNote('1', '1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.title).toBe('Test Note');
    });

    it('笔记不存在时应该返回 null', async () => {
      (db.query.notes.findFirst as any).mockResolvedValue(null);

      const result = await noteService.getNote('999', '1');

      expect(result).toBeNull();
    });

    it('数据库错误时应该返回 null', async () => {
      (db.query.notes.findFirst as any).mockRejectedValue(new Error('Database error'));

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

      const mockReturning = vi.fn().mockResolvedValue(undefined);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      // Mock getNote call
      (db.query.notes.findFirst as any).mockResolvedValue({
        ...mockNote,
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

      const mockReturning = vi.fn().mockResolvedValue(undefined);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      (db.query.notes.findFirst as any).mockResolvedValue(null);

      const result = await noteService.updateNote('999', '1', request);

      expect(result).toBeNull();
    });

    it('数据库错误时应该返回 null', async () => {
      const request: UpdateNoteRequestType = {
        title: 'Updated Note',
      };

      (db.update as any).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await noteService.updateNote('1', '1', request);

      expect(result).toBeNull();
    });
  });

  describe('deleteNote', () => {
    it('应该成功删除笔记', async () => {
      const mockWhere = vi.fn().mockReturnValue({ lastInsertRowid: 1 });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await noteService.deleteNote('1', '1');

      expect(result).toBe(true);
    });

    it('笔记不存在时应该返回 false', async () => {
      const mockWhere = vi.fn().mockReturnValue(null);
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await noteService.deleteNote('999', '1');

      expect(result).toBe(false);
    });

    it('数据库错误时应该返回 false', async () => {
      (db.delete as any).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await noteService.deleteNote('1', '1');

      expect(result).toBe(false);
    });
  });

  describe('deleteNotes', () => {
    it('应该成功批量删除笔记', async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await noteService.deleteNotes(['1', '2', '3'], '1');

      expect(result).toBe(true);
    });

    it('数据库错误时应该返回 false', async () => {
      (db.delete as any).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await noteService.deleteNotes(['1'], '1');

      expect(result).toBe(false);
    });
  });

  describe('getUserTags', () => {
    it('应该返回用户的所有标签', async () => {
      const mockNotes = [
        { ...mockNote, tags: ['tag1', 'tag2'] },
        { ...mockNote, id: 2, tags: ['tag2', 'tag3'] },
      ];
      (db.query.notes.findMany as any).mockResolvedValue(mockNotes);

      const result = await noteService.getUserTags('1');

      expect(result).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
      expect(result).toHaveLength(3);
    });

    it('没有笔记时应该返回空数组', async () => {
      (db.query.notes.findMany as any).mockResolvedValue([]);

      const result = await noteService.getUserTags('1');

      expect(result).toHaveLength(0);
    });

    it('数据库错误时应该返回空数组', async () => {
      (db.query.notes.findMany as any).mockRejectedValue(new Error('Database error'));

      const result = await noteService.getUserTags('1');

      expect(result).toHaveLength(0);
    });
  });

  describe('searchNotes', () => {
    it('应该搜索用户的笔记', async () => {
      (authService.getCurrentUserId as any).mockResolvedValue('1');
      (db.query.notes.findMany as any).mockResolvedValue([mockNote]);

      const result = await noteService.searchNotes('content');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Note');
    });

    it('用户未登录时应该返回空数组', async () => {
      (authService.getCurrentUserId as any).mockResolvedValue('');

      const result = await noteService.searchNotes('content');

      expect(result).toHaveLength(0);
    });

    it('数据库错误时应该返回空数组', async () => {
      (authService.getCurrentUserId as any).mockResolvedValue('1');
      (db.query.notes.findMany as any).mockRejectedValue(new Error('Database error'));

      const result = await noteService.searchNotes('content');

      expect(result).toHaveLength(0);
    });
  });
});