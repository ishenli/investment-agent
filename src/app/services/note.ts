import { NoteType } from "@server/service/noteService";
import { get as requestGet, post as requestPost, put as requestPut, del as requestDelete } from "@/app/lib/request";

// 定义API响应类型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 定义查询参数类型
interface GetNotesParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  tag?: string;
}

// 定义创建/更新笔记的请求体类型
interface NoteRequestBody {
  id?: string;
  title: string;
  content: string;
  tags: string[];
}

/**
 * 获取笔记列表
 * @param params 查询参数
 * @returns 笔记列表和总数
 */
export async function getNotes(params: GetNotesParams = {}): Promise<ApiResponse<{ items: NoteType[]; totalCount: number }>> {
  try {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const result = await requestGet(`/api/note?${queryParams.toString()}`);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('获取笔记列表失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 获取单个笔记详情
 * @param id 笔记ID
 * @returns 笔记详情
 */
export async function getNoteById(id: string): Promise<ApiResponse<NoteType>> {
  try {
    const result = await requestGet(`/api/note/${id}`);
    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error('获取笔记详情失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 创建笔记
 * @param data 笔记数据
 * @returns 创建的笔记
 */
export async function createNote(data: Omit<NoteRequestBody, 'id'>): Promise<ApiResponse<NoteType>> {
  try {
    const result = await requestPost('/api/note', data);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('创建笔记失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 更新笔记
 * @param id 笔记ID
 * @param data 更新的笔记数据
 * @returns 更新后的笔记
 */
export async function updateNote(id: string, data: NoteRequestBody): Promise<ApiResponse<NoteType>> {
  try {
    const result = await requestPut(`/api/note/${id}`, data);
    return result;
  } catch (error) {
    console.error('更新笔记失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 删除笔记
 * @param id 笔记ID
 * @returns 删除结果
 */
export async function deleteNote(id: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const result = await requestDelete(`/api/note/${id}`);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('删除笔记失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 获取用户标签列表
 * @returns 标签列表
 */
export async function getUserTags(): Promise<ApiResponse<string[]>> {
  try {
    const result = await requestGet('/api/note/tags');
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('获取标签列表失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}