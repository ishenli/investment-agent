// 笔记类型定义
export type NoteType = {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

// 创建笔记请求类型
export type CreateNoteRequestType = {
  userId: string;
  title: string;
  content: string;
  tags: string[];
};

// 更新笔记请求类型
export type UpdateNoteRequestType = {
  title?: string;
  content?: string;
  tags?: string[];
};

// 笔记列表响应类型
export type NoteListResponseType = {
  items: NoteType[];
  totalCount: number;
};

// 笔记搜索参数类型
export type NoteSearchParams = {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  tag?: string;
};