import logger from '@server/base/logger';
import authService from '@server/service/authService';
import { noteRepository, NoteEntity } from '@server/repository/noteRepository';

// Response DTO types (using string IDs for external API)
export type NoteType = {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateNoteRequestType = {
  userId: string;
  title: string;
  content: string;
  tags: string[];
};

export type UpdateNoteRequestType = {
  title?: string;
  content?: string;
  tags?: string[];
};

// Private transform function
function toNoteResponse(entity: NoteEntity): NoteType {
  return {
    id: entity.id.toString(),
    userId: entity.userId.toString(),
    title: entity.title,
    content: entity.content,
    tags: entity.tags as string[],
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export class NoteService {
  constructor() {
    // Repository already initialized
  }

  // ============== Create Operations ==============

  /**
   * 创建新笔记
   * @param request 创建笔记请求数据
   * @returns 创建的笔记
   */
  async createNote(request: CreateNoteRequestType): Promise<NoteType> {
    try {
      const entity = await noteRepository.create({
        userId: parseInt(request.userId),
        title: request.title,
        content: request.content,
        tags: request.tags,
        deletedAt: null,
      });

      logger.info(`Note created successfully for user ${request.userId}`);
      return toNoteResponse(entity);
    } catch (error) {
      logger.error(`Failed to create note: ${error}`);
      throw error;
    }
  }

  // ============== Query Operations ==============

  /**
   * 获取用户的笔记列表
   * @param userId 用户ID
   * @param limit 限制数量
   * @param offset 偏移量
   * @param sortBy 排序字段
   * @param sortOrder 排序顺序
   * @returns 笔记列表和总数
   */
  async getUserNotes(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    sortBy: 'createdAt' | 'updatedAt' | 'title' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string,
    tag?: string,
  ): Promise<{ items: NoteType[]; totalCount: number }> {
    try {
      const { items, totalCount } = await noteRepository.findByUserId(parseInt(userId), {
        limit,
        offset,
        sortBy,
        sortOrder,
        search,
        tag,
      });

      return {
        items: items.map(toNoteResponse),
        totalCount,
      };
    } catch (error) {
      logger.error(`Failed to list notes for user ${userId}: ${error}`);
      return { items: [], totalCount: 0 };
    }
  }

  /**
   * 获取笔记详情
   * @param noteId 笔记ID
   * @param userId 用户ID
   * @returns 笔记详情
   */
  async getNote(noteId: string, userId: string): Promise<NoteType | null> {
    try {
      const entity = await noteRepository.findByIdAndUserId(parseInt(noteId), parseInt(userId));
      return entity ? toNoteResponse(entity) : null;
    } catch (error) {
      logger.error(`Failed to read note ${noteId}: ${error}`);
      return null;
    }
  }

  /**
   * 获取用户的所有标签
   * @param userId 用户ID
   * @returns 标签列表
   */
  async getUserTags(userId: string): Promise<string[]> {
    try {
      return await noteRepository.findUserTags(parseInt(userId));
    } catch (error) {
      logger.error(`Failed to get tags for user ${userId}: ${error}`);
      return [];
    }
  }

  /**
   * 搜索笔记
   * @param query 搜索内容
   * @returns 笔记列表
   */
  async searchNotes(query: string): Promise<NoteType[]> {
    const userId = await authService.getCurrentUserId();
    if (!userId) return [];

    try {
      const entities = await noteRepository.searchByUserIdAndContent(parseInt(userId), query);
      return entities.map(toNoteResponse);
    } catch (error) {
      logger.error(`Failed to search notes for user ${userId}: ${error}`);
      return [];
    }
  }

  // ============== Update Operations ==============

  /**
   * 更新笔记
   * @param noteId 笔记ID
   * @param userId 用户ID
   * @param request 更新请求数据
   * @returns 更新后的笔记
   */
  async updateNote(
    noteId: string,
    userId: string,
    request: UpdateNoteRequestType,
  ): Promise<NoteType | null> {
    try {
      const entity = await noteRepository.updateByIdAndUserId(
        parseInt(noteId),
        parseInt(userId),
        request,
      );

      if (!entity) return null;

      logger.info(`Note ${noteId} updated successfully`);
      return toNoteResponse(entity);
    } catch (error) {
      logger.error(`Failed to update note ${noteId}: ${error}`);
      return null;
    }
  }

  // ============== Delete Operations ==============

  /**
   * 删除笔记
   * @param noteId 笔记ID
   * @param userId 用户ID
   * @returns 是否删除成功
   */
  async deleteNote(noteId: string, userId: string): Promise<boolean> {
    try {
      const result = await noteRepository.deleteByIdAndUserId(parseInt(noteId), parseInt(userId));
      if (result) {
        logger.info(`Note ${noteId} deleted successfully`);
      }
      return result;
    } catch (error) {
      logger.error(`Failed to delete note ${noteId}: ${error}`);
      return false;
    }
  }

  /**
   * 批量删除笔记
   * @param noteIds 笔记ID数组
   * @param userId 用户ID
   * @returns 是否删除成功
   */
  async deleteNotes(noteIds: string[], userId: string): Promise<boolean> {
    try {
      const ids = noteIds.map((id) => parseInt(id));
      const result = await noteRepository.deleteByUserIdAndIds(parseInt(userId), ids);
      if (result) {
        logger.info(`Notes ${noteIds.join(', ')} deleted successfully`);
      }
      return result;
    } catch (error) {
      logger.error(`Failed to delete notes: ${error}`);
      return false;
    }
  }
}

const noteService = new NoteService();

export default noteService;