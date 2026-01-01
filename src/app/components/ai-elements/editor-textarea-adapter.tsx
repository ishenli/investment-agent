"use client";

import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';

interface EditorTextAreaAdapterProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  // 可以添加特定于适配器的属性
}

const EditorTextAreaAdapter = forwardRef<HTMLTextAreaElement, EditorTextAreaAdapterProps>(
  ({ className, value, onChange, placeholder, ...props }, ref) => {
    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // 暴露与 textarea 类似的接口
    useImperativeHandle(ref, () => ({
      focus: () => {
        // 尝试获取编辑器实例并聚焦
        if (containerRef.current) {
          const editable = containerRef.current.querySelector('.block-kit-editable');
          if (editable) {
            (editable as HTMLElement).focus();
          }
        }
      },
      blur: () => {
        if (containerRef.current) {
          const editable = containerRef.current.querySelector('.block-kit-editable');
          if (editable) {
            (editable as HTMLElement).blur();
          }
        }
      },
      select: () => {
        // EditorTextArea 可能不支持选择所有文本
        console.log('Select called on EditorTextAreaAdapter');
      },
      setSelectionRange: (start: number, end: number) => {
        // EditorTextArea 可能不支持设置选择范围
        console.log('SetSelectionRange called on EditorTextAreaAdapter', start, end);
      },
      value: value || '',
      // 添加其他 textarea 的方法和属性
    } as unknown as HTMLTextAreaElement));

    // 处理值变化 - 这里需要根据实际需求实现
    useEffect(() => {
      // 如果需要将值同步到 EditorTextArea，需要查看其 API
      // 这里可能需要根据 EditorTextArea 的实际实现进行调整
    }, [value]);

    return (
      <div 
        ref={containerRef}
        className={className}
        style={{ 
          display: 'flex',
          flex: 1,
          resize: undefined, // 修复类型问题
          borderRadius: '0',
          border: '0',
          background: 'transparent',
          padding: '12px 0',
          boxShadow: 'none',
          width: '100%',
          minHeight: '64px',
          maxHeight: '192px'
        }}
      >
      </div>
    );
  }
);

EditorTextAreaAdapter.displayName = 'EditorTextAreaAdapter';

export default EditorTextAreaAdapter;