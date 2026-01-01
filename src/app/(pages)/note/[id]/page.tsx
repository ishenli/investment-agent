'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { NoteType } from '@server/service/noteService';
import { useErrorHandler } from '@renderer/hooks/useErrorHandler';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Input } from '@renderer/components/ui/input';
import { Textarea } from '@renderer/components/ui/textarea';
import dayjs from 'dayjs';
import { getNoteById, updateNote } from '@/app/services/note';
import { Markdown } from '@lobehub/ui';

export default function NoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  
  const { error, handleError, clearError } = useErrorHandler();
  
  const [note, setNote] = useState<NoteType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // 编辑状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  
  useEffect(() => {
    if (id) {
      fetchNoteDetail();
    }
  }, [id]);
  
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags || []);
    }
  }, [note]);
  
  const fetchNoteDetail = async () => {
    setLoading(true);
    clearError();
    
    try {
      const response = await getNoteById(id as string);
      
      if (response.success && response.data) {
        setNote(response.data);
      } else {
        handleError(response.error || '获取笔记详情失败');
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    router.push('/note');
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    // 恢复原始数据
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags || []);
    }
    setIsEditing(false);
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
  
  const handleSaveNote = async () => {
    if (!note) return;
    
    setIsSaveLoading(true);
    clearError();
    
    try {
      const response = await updateNote(note.id, {
        id: note.id,
        title,
        content,
        tags
      });
      
      if (response.success && response.data) {
        // 先更新笔记数据
        setNote(response.data);
        // 更新编辑状态
        setTitle(response.data.title);
        setContent(response.data.content);
        setTags(response.data.tags || []);
        // 最后关闭编辑模式
        setIsEditing(false);
      } else {
        handleError(response.error || '保存笔记失败');
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsSaveLoading(false);
    }
  };
  
  // 渲染详情视图
  const renderDetailView = () => {
    if (!note) return null;
    
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex justify-between items-center">
          <Button onClick={handleBack} variant="outline">
            ← 返回笔记列表
          </Button>
          <Button onClick={handleEdit}>
            编辑笔记
          </Button>
        </div>
        
        <Card className="mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">{note.title}</CardTitle>
            <div className="flex justify-between text-sm text-gray-500">
              <div>
                创建时间: {dayjs(note.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </div>
              <div>
                更新时间: {dayjs(note.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="prose max-w-none mb-6">
              <Markdown>{note.content}</Markdown>
            </div>
            
            {note.tags && note.tags.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">标签</h3>
                <div className="flex flex-wrap gap-2">
                  {note.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // 渲染编辑视图
  const renderEditView = () => {
    if (!note) return null;
    
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex justify-between items-center">
          <Button onClick={handleBack} variant="outline">
            ← 返回笔记列表
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              取消
            </Button>
            <Button onClick={handleSaveNote} disabled={isSaveLoading}>
              {isSaveLoading ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
        
        {/* 加载指示器 */}
        {isSaveLoading && (
          <div className="absolute top-4 right-4">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* 错误提示 */}
        {error && (
          <div className="p-4 bg-red-100 text-red-700 mb-4 rounded">
            {error}
          </div>
        )}
        
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">编辑笔记</CardTitle>
          </CardHeader>
          
          <CardContent>
            {/* 标题输入 */}
            <div className="mb-6">
              <Input
                type="text"
                placeholder="请输入笔记标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold h-12"
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
                className="h-96"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={handleBack}>返回笔记列表</Button>
      </div>
    );
  }
  
  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-gray-500 mb-4">笔记不存在</div>
        <Button onClick={handleBack}>返回笔记列表</Button>
      </div>
    );
  }
  
  return isEditing ? renderEditView() : renderDetailView();
}