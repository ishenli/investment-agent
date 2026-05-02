/**
 * Note Business Logic
 *
 * 纯业务函数，无框架耦合。
 */
import noteService from '@server/service/noteService';
import logger from '@server/base/logger';

/**
 * 查询投资笔记
 */
export async function searchNotes(query: string): Promise<string> {
  logger.info(`[business/note] searchNotes: ${query}`);
  try {
    const result = await noteService.searchNotes(query);
    return `笔记查询结果: ${result}`;
  } catch (e) {
    throw new Error(`笔记查询失败: ${(e as Error).message}`);
  }
}
