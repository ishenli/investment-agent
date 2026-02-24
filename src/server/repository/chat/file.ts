/**
 * File Repository
 *
 * 聊天文件附件数据访问层
 */
import { db } from '@server/lib/db';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  chatFiles,
  type ChatFile,
  type NewChatFile,
} from '@drizzle/schema/chat';
import { BaseRepository } from './base';

export type CreateFileParams = Omit<NewChatFile, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateFileParams = Partial<Omit<NewChatFile, 'id' | 'createdAt' | 'updatedAt'>>;

export class FileRepository extends BaseRepository<ChatFile> {
  constructor() {
    super(chatFiles);
  }

  // ============== Query ==============

  /**
   * 根据消息 ID 获取文件列表
   */
  async findByMessageId(messageId: string): Promise<ChatFile[]> {
    return db
      .select()
      .from(chatFiles)
      .where(eq(chatFiles.messageId, messageId));
  }

  /**
   * 根据会话 ID 获取所有文件
   */
  async findBySessionId(sessionId: string): Promise<ChatFile[]> {
    return db
      .select()
      .from(chatFiles)
      .where(eq(chatFiles.sessionId, sessionId))
      .orderBy(chatFiles.createdAt);
  }

  /**
   * 根据文件类型筛选
   */
  async findByFileType(sessionId: string, fileType: string): Promise<ChatFile[]> {
    return db
      .select()
      .from(chatFiles)
      .where(
        and(
          eq(chatFiles.sessionId, sessionId),
          eq(chatFiles.fileType, fileType)
        )
      );
  }

  /**
   * 获取图片文件
   */
  async findImages(sessionId: string): Promise<ChatFile[]> {
    // 获取图片类型的文件（fileType 以 'image/' 开头）
    const files = await this.findBySessionId(sessionId);
    return files.filter((f) => f.fileType.startsWith('image/'));
  }

  /**
   * 获取未关联消息的文件
   */
  async findOrphaned(sessionId: string): Promise<ChatFile[]> {
    return db
      .select()
      .from(chatFiles)
      .where(
        and(
          eq(chatFiles.sessionId, sessionId),
          isNull(chatFiles.messageId)
        )
      );
  }

  // ============== Create ==============

  /**
   * 创建文件记录
   */
  async create(data: CreateFileParams): Promise<string> {
    const id = nanoid();
    const now = new Date();

    await db.insert(chatFiles).values({
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  }

  /**
   * 批量创建文件记录
   */
  async batchCreate(files: CreateFileParams[]): Promise<string[]> {
    const ids: string[] = [];
    const now = new Date();

    const values = files.map((data) => {
      const id = nanoid();
      ids.push(id);
      return {
        id,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
    });

    await db.insert(chatFiles).values(values);

    return ids;
  }

  // ============== Update ==============

  /**
   * 更新文件记录
   */
  async update(id: string, data: UpdateFileParams): Promise<boolean> {
    const result = await db
      .update(chatFiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(chatFiles.id, id));

    return result.rowsAffected > 0;
  }

  /**
   * 关联文件到消息
   */
  async bindToMessage(fileIds: string[], messageId: string): Promise<number> {
    const result = await db
      .update(chatFiles)
      .set({ messageId, updatedAt: new Date() })
      .where(inArray(chatFiles.id, fileIds));

    return result.rowsAffected;
  }

  // ============== Delete ==============

  /**
   * 删除文件
   */
  async delete(id: string): Promise<boolean> {
    return this._delete(id);
  }

  /**
   * 批量删除文件
   */
  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await db.delete(chatFiles).where(inArray(chatFiles.id, ids));

    return result.rowsAffected;
  }

  /**
   * 删除消息的所有文件
   */
  async deleteByMessageId(messageId: string): Promise<number> {
    const result = await db.delete(chatFiles).where(eq(chatFiles.messageId, messageId));

    return result.rowsAffected;
  }

  /**
   * 删除会话的所有文件
   */
  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await db.delete(chatFiles).where(eq(chatFiles.sessionId, sessionId));

    return result.rowsAffected;
  }
}

// Export singleton instance
export const fileRepository = new FileRepository();