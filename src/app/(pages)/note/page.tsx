'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { NoteType, NoteSearchParams } from '@typings/note';
import { useErrorHandler } from '@renderer/hooks/useErrorHandler';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Textarea } from '@renderer/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

export default function NotePage() {
  const router = useRouter();
  // 错误处理 hooks
  const { error, isLoading, handleError, clearError } = useErrorHandler();
  
  // 防抖定时器引用
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // 笔记状态
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // 搜索和筛选状态
  const [searchParams, setSearchParams] = useState<NoteSearchParams>({
    limit: 20,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  
  // 表单状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // 标签管理状态
  const [allTags, setAllTags] = useState<string[]>([]);
  
  // 分页状态
  const [totalCount, setTotalCount] = useState(0);
  
  // 独立的加载状态
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [isTagsLoading, setIsTagsLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  
  // 创建一个带参数的 fetchNotes 函数
  const fetchNotesWithParams = useCallback((params: NoteSearchParams) => {
    setIsNotesLoading(true);
    clearError();
    
    try {
      const urlParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          urlParams.append(key, value.toString());
        }
      });
      
      fetch(`/api/note?${urlParams.toString()}`)
        .then(response => response.json())
        .then(result => {
          if (result.success) {
            setNotes(result.data.items);
            setTotalCount(result.data.totalCount);
          } else {
            handleError(result.message || '获取笔记列表失败');
          }
        })
        .catch(error => {
          handleError(error);
        })
        .finally(() => {
          setIsNotesLoading(false);
        });
    } catch (error) {
      handleError(error);
      setIsNotesLoading(false);
    }
  }, [clearError, handleError]);

  // 获取所有标签
  const fetchTags = useCallback(async () => {
    setIsTagsLoading(true);
    clearError();
    
    try {
      const response = await fetch('/api/note/tags');
      const result = await response.json();
      
      if (result.success) {
        setAllTags(result.data);
      } else {
        handleError('获取标签列表失败');
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsTagsLoading(false);
    }
  }, [clearError, handleError]);

  // 初始化数据
  useEffect(() => {
    fetchNotesWithParams(searchParams);
    fetchTags();
    
    // 清理函数，组件卸载时清除定时器
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // 处理搜索参数变化（普通参数变化，需要防抖）
  const handleSearchParamChange = (newParams: Partial<NoteSearchParams>) => {
    // 清除之前的定时器
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    // 立即更新搜索参数以提供即时UI反馈
    const updatedParams = {
      ...searchParams,
      ...newParams,
      offset: 0 // 重置分页
    };
    
    setSearchParams(updatedParams);
    
    // 设置新的防抖定时器
    searchDebounceRef.current = setTimeout(() => {
      // 触发实际的搜索请求
      fetchNotesWithParams(updatedParams);
    }, 300); // 使用300ms的防抖延迟
  };

  // 处理分页变化（不需要防抖）
  const handlePageChange = (newPage: number) => {
    const updatedParams = {
      ...searchParams,
      offset: (newPage - 1) * (searchParams.limit || 20)
    };
    
    setSearchParams(updatedParams);
    // 分页变化后立即触发请求
    fetchNotesWithParams(updatedParams);
  };

  // 处理创建新笔记
  const handleCreateNote = () => {
    setSelectedNote(null);
    setTitle('');
    setContent('');
    setTags([]);
    setIsEditing(true);
  };

  // 处理保存笔记
  const handleSaveNote = async () => {
    setIsSaveLoading(true);
    clearError();
    
    try {
      const method = selectedNote ? 'PUT' : 'POST';
      const url = selectedNote ? `/api/note/${selectedNote.id}` : '/api/note';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          tags
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIsEditing(false);
        await fetchNotesWithParams(searchParams); // 重新获取笔记列表
        await fetchTags(); // 重新获取标签列表
      } else {
        handleError(result.message || '保存笔记失败');
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsSaveLoading(false);
    }
  };

  // 处理删除笔记
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('确定要删除这个笔记吗？')) {
      return;
    }
    
    setIsDeleteLoading(true);
    clearError();
    
    try {
      const response = await fetch(`/api/note/${noteId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchNotesWithParams(searchParams); // 重新获取笔记列表
        await fetchTags(); // 重新获取标签列表
      } else {
        handleError(result.message || '删除笔记失败');
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  
  // 处理添加标签
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // 处理删除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 处理按标签筛选
  const handleFilterByTag = (tag: string) => {
    handleSearchParamChange({ tag });
  };

  // 处理清除筛选
  const handleClearFilter = () => {
    handleSearchParamChange({ tag: undefined, search: undefined });
  };

  // 计算分页信息
  const currentPage = Math.floor((searchParams.offset || 0) / (searchParams.limit || 20)) + 1;
  const totalPages = Math.ceil(totalCount / (searchParams.limit || 20));

  // 渲染笔记列表视图
  const renderNoteListView = () => (
    <div className="flex flex-col h-full">
      {/* 加载指示器 */}
      {(isLoading || isNotesLoading || isTagsLoading) && (
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* 搜索和筛选区域 */}
      <div className="mx-4 py-4 border-b">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="搜索笔记标题或内容..."
              value={searchParams.search || ''}
              onChange={(e) => handleSearchParamChange({ search: e.target.value })}
            />
          </div>
          
          {/* 排序选项 */}
          <div className="flex gap-2">
            <Select value={searchParams.sortBy} onValueChange={(value) => handleSearchParamChange({ sortBy: value })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="排序字段" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">创建时间</SelectItem>
                <SelectItem value="updatedAt">更新时间</SelectItem>
                <SelectItem value="title">标题</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={searchParams.sortOrder} onValueChange={(value) => handleSearchParamChange({ sortOrder: value as 'asc' | 'desc' })}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">降序</SelectItem>
                <SelectItem value="asc">升序</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreateNote}>
              新建笔记
            </Button>
          </div>
        </div>
        
        {/* 标签筛选 */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium ">标签筛选:</span>
          {allTags.map(tag => (
            <Button
              key={tag}
              variant={searchParams.tag === tag ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterByTag(tag)}
              className="rounded-full"
            >
              {tag}
            </Button>
          ))}
          {searchParams.tag && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearFilter}
              className="rounded-full"
            >
              清除筛选
            </Button>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700">
          {error}
        </div>
      )}

      {/* 笔记列表 */}
      <div className="flex-1 overflow-auto">
        {isNotesLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-lg">加载中...</div>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">暂无笔记</p>
              <Button onClick={handleCreateNote} className="mt-4">
                创建第一个笔记
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {notes.map(note => (
              <Card 
                key={note.id} 
                className="hover:shadow-md transition-shadow gap-1 cursor-pointer"
              >
                <CardHeader onClick={() => router.push(`/note/${note.id}`)}>
                  <CardTitle className="truncate">{note.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p 
                    className="text-gray-600 text-sm line-clamp-3 cursor-pointer"
                    onClick={() => router.push(`/note/${note.id}`)}
                  >
                    {note.content}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {note.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="mt-3 text-xs text-right text-gray-500">
                    <div>更新: {dayjs(note.updatedAt).format('YYYY-MM-DD HH:mm')}</div>
                  </div>
                  
                  <div className="mt-4 flex gap-2 justify-end">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      disabled={isDeleteLoading}
                    >
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="p-4 border-t flex justify-center">
          <div className="flex gap-2">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isNotesLoading}
              variant="outline"
            >
              上一页
            </Button>
            
            <span className="px-3 py-1 flex items-center">
              {currentPage} / {totalPages}
            </span>
            
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isNotesLoading}
              variant="outline"
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染笔记编辑视图
  const renderNoteEditorView = () => (
    <div className="flex flex-col h-full">
      {/* 编辑器头部 */}
      <div className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold">
          {selectedNote ? '编辑笔记' : '新建笔记'}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            取消
          </Button>
          <Button onClick={handleSaveNote} disabled={isSaveLoading}>
            {isSaveLoading ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
      
      {/* 加载指示器 */}
      {(isLoading || isSaveLoading) && (
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700">
          {error}
        </div>
      )}

      {/* 编辑器表单 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl">
          {/* 标题输入 */}
          <div className="mb-6">
            <Input
              type="text"
              placeholder="请输入笔记标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold h-9"
            />
          </div>

          {/* 标签管理 */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span 
                  key={tag} 
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full flex items-center"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-blue-800 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                className="h-9"
                type="text"
                placeholder="添加标签"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button onClick={handleAddTag}>
                添加
              </Button>
            </div>
          </div>

          {/* 内容编辑器 */}
          <div className="mb-6">
            <Textarea
              placeholder="请输入笔记内容（支持 Markdown 语法）"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="h-60"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染主界面
  return (
    <div className="h-screen flex flex-col  p-4">
      {isEditing ? (
        renderNoteEditorView()
      ) : (
        renderNoteListView()
      )}
    </div>
  );
}