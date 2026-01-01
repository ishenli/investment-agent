import { WithRequestContext } from '../base/decorators';
import { AuthService } from '../service/authService';
import noteService from '../service/noteService';
import { BaseBizController } from './base';

export class NoteController extends BaseBizController {
  @WithRequestContext()
  async getAllNotes(param: {
    limit: string;
    offset: string;
    sortBy: string;
    sortOrder: string;
    search: string;
    tag: string;
  }) {
    try {
      // 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }
      const { limit, offset, sortBy, sortOrder, search, tag } = param;
      // 获取笔记列表
      const result = await noteService.getUserNotes(
        userId,
        parseInt(limit),
        parseInt(offset),
        sortBy,
        sortOrder as 'asc' | 'desc',
        search,
        tag,
      );

      return this.success(result);
    } catch (error) {
      return this.error('获取笔记列表失败', 'get_notes_error');
    }
  }

  @WithRequestContext()
  async getNoteById(param: {
    id: string;
  }) {
    try {
      // 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!param.id) {
        return this.error('笔记ID不能为空', 'validation_error');
      }

      // 获取笔记详情
      const note = await noteService.getNote(param.id, userId);

      if (!note) {
        return this.error('笔记不存在', 'note_not_found');
      }

      return this.success(note);
    } catch (error) {
      return this.error('获取笔记详情失败', 'get_note_error');
    }
  }

  @WithRequestContext()
  async createNote(body: {
    title: string;
    content: string;
    tags: string[];
  }) {
    try {
      // 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.title || !body.content) {
        return this.error('标题和内容不能为空', 'validation_error');
      }

      // 创建笔记
      const note = await noteService.createNote({
        userId,
        title: body.title,
        content: body.content,
        tags: body.tags || [],
      });

      return this.success(note);
    } catch (error) {
      return this.error('创建笔记失败', 'create_note_error');
    }
  }

  @WithRequestContext()
  async updateNote(body: {
    id: string;
    title: string;
    content: string;
    tags: string[];
  }) {
    try {
      // 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.id) {
        return this.error('笔记ID不能为空', 'validation_error');
      }

      if (!body.title || !body.content) {
        return this.error('标题和内容不能为空', 'validation_error');
      }

      // 更新笔记
      const note = await noteService.updateNote(body.id, userId, {
        title: body.title,
        content: body.content,
        tags: body.tags || [],
      });

      if (!note) {
        return this.error('笔记不存在或无权限修改', 'update_note_error');
      }

      return this.success(note);
    } catch (error) {
      return this.error('更新笔记失败', 'update_note_error');
    }
  }

  @WithRequestContext()
  async deleteNote(body: {
    id: string;
  }) {
    try {
      // 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.id) {
        return this.error('笔记ID不能为空', 'validation_error');
      }

      // 删除笔记
      const result = await noteService.deleteNote(body.id, userId);

      if (!result) {
        return this.error('笔记不存在或无权限删除', 'delete_note_error');
      }

      return this.success({ message: '删除成功' });
    } catch (error) {
      return this.error('删除笔记失败', 'delete_note_error');
    }
  }

  @WithRequestContext()
  async getUserTags() {
    try {
      // 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 获取用户标签
      const tags = await noteService.getUserTags(userId);

      return this.success(tags);
    } catch (error) {
      return this.error('获取标签列表失败', 'get_tags_error');
    }
  }
}