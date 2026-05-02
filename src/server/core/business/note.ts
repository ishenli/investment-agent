/**
 * Note Business Logic
 *
 * 纯业务函数，无框架耦合。
 */
import noteService from '@server/service/noteService';
import authService from '@server/service/authService';
import logger from '@server/base/logger';

// ============== Create Operations ==============

/**
 * 创建投资笔记
 */
export async function createNote(
  title: string,
  content: string,
  tags?: string[],
): Promise<string> {
  const userId = await authService.getCurrentUserId();
  if (!userId) {
    throw new Error('用户未登录，无法创建笔记');
  }

  logger.info(`[business/note] createNote: ${title}`);
  try {
    const note = await noteService.createNote({
      userId,
      title,
      content,
      tags: tags ?? [],
    });
    return `笔记创建成功！\nID: ${note.id}\n标题: ${note.title}\n标签: ${note.tags.join(', ') || '无'}\n创建时间: ${note.createdAt.toISOString()}`;
  } catch (e) {
    throw new Error(`笔记创建失败: ${(e as Error).message}`);
  }
}

// ============== Query Operations ==============

/**
 * 列出当前用户的投资笔记（支持分页、搜索、标签过滤）
 */
export async function listNotes(
  limit?: number,
  offset?: number,
  search?: string,
  tag?: string,
  sortBy?: 'createdAt' | 'updatedAt' | 'title',
  sortOrder?: 'asc' | 'desc',
): Promise<string> {
  const userId = await authService.getCurrentUserId();
  if (!userId) {
    throw new Error('用户未登录，无法获取笔记列表');
  }

  logger.info(`[business/note] listNotes: userId=${userId}, search=${search}, tag=${tag}`);
  try {
    const { items, totalCount } = await noteService.getUserNotes(
      userId,
      limit ?? 20,
      offset ?? 0,
      sortBy ?? 'createdAt',
      sortOrder ?? 'desc',
      search,
      tag,
    );

    if (items.length === 0) {
      return '未找到任何笔记。';
    }

    const lines = items.map((note) => {
      const tagStr = note.tags.length > 0 ? ` [${note.tags.join(', ')}]` : '';
      return `[${note.id}] ${note.title}${tagStr} (${note.updatedAt.toISOString().slice(0, 10)})`;
    });

    return `共 ${totalCount} 条笔记，当前页 ${items.length} 条:\n${lines.join('\n')}`;
  } catch (e) {
    throw new Error(`笔记列表获取失败: ${(e as Error).message}`);
  }
}

/**
 * 获取单条笔记详情
 */
export async function getNote(noteId: string): Promise<string> {
  const userId = await authService.getCurrentUserId();
  if (!userId) {
    throw new Error('用户未登录，无法获取笔记');
  }

  logger.info(`[business/note] getNote: ${noteId}`);
  try {
    const note = await noteService.getNote(noteId, userId);
    if (!note) {
      return `未找到 ID 为 ${noteId} 的笔记。`;
    }

    const tagStr = note.tags.length > 0 ? note.tags.join(', ') : '无';
    return `笔记详情 [${note.id}]\n标题: ${note.title}\n标签: ${tagStr}\n创建时间: ${note.createdAt.toISOString()}\n更新时间: ${note.updatedAt.toISOString()}\n\n内容:\n${note.content}`;
  } catch (e) {
    throw new Error(`笔记获取失败: ${(e as Error).message}`);
  }
}

/**
 * 搜索投资笔记内容
 */
export async function searchNotes(query: string): Promise<string> {
  logger.info(`[business/note] searchNotes: ${query}`);
  try {
    const result = await noteService.searchNotes(query);
    if (result.length === 0) {
      return `未找到包含 "${query}" 的笔记。`;
    }
    const lines = result.map((note) => {
      const tagStr = note.tags.length > 0 ? ` [${note.tags.join(', ')}]` : '';
      return `[${note.id}] ${note.title}${tagStr}`;
    });
    return `找到 ${result.length} 条相关笔记:\n${lines.join('\n')}`;
  } catch (e) {
    throw new Error(`笔记查询失败: ${(e as Error).message}`);
  }
}

// ============== Update Operations ==============

/**
 * 更新投资笔记
 */
export async function updateNote(
  noteId: string,
  title?: string,
  content?: string,
  tags?: string[],
): Promise<string> {
  const userId = await authService.getCurrentUserId();
  if (!userId) {
    throw new Error('用户未登录，无法更新笔记');
  }

  logger.info(`[business/note] updateNote: ${noteId}`);
  try {
    const updateData: { title?: string; content?: string; tags?: string[] } = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;

    const note = await noteService.updateNote(noteId, userId, updateData);
    if (!note) {
      return `未找到 ID 为 ${noteId} 的笔记，或无权更新。`;
    }

    return `笔记更新成功！\nID: ${note.id}\n标题: ${note.title}\n更新时间: ${note.updatedAt.toISOString()}`;
  } catch (e) {
    throw new Error(`笔记更新失败: ${(e as Error).message}`);
  }
}

// ============== Delete Operations ==============

/**
 * 删除投资笔记
 */
export async function deleteNote(noteId: string): Promise<string> {
  const userId = await authService.getCurrentUserId();
  if (!userId) {
    throw new Error('用户未登录，无法删除笔记');
  }

  logger.info(`[business/note] deleteNote: ${noteId}`);
  try {
    const success = await noteService.deleteNote(noteId, userId);
    if (!success) {
      return `未找到 ID 为 ${noteId} 的笔记，或无权删除。`;
    }
    return `笔记 ID ${noteId} 已成功删除。`;
  } catch (e) {
    throw new Error(`笔记删除失败: ${(e as Error).message}`);
  }
}
