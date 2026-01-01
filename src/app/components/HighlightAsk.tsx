// hooks/useHighlightAsk.ts
import { useState, useEffect, RefObject } from 'react';
import { Button } from './ui/button';
import { MessageSquareQuote } from 'lucide-react';

type UseHighlightAskOptions = {
  onAsk?: (text: string) => void;
  enabled?: boolean; // 是否启用该功能
};

export const useHighlightAsk = (
  containerRef: RefObject<HTMLElement>,
  options: UseHighlightAskOptions = {},
) => {
  const { onAsk, enabled = true } = options;
  const [selectedText, setSelectedText] = useState<string>('');
  const [floatPosition, setFloatPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';

      if (text.length > 0) {
        const range = selection && selection.getRangeAt(0);
        const rect = range && range.getBoundingClientRect();
        if (!rect) return;

        // 定位：浮层居中显示在选区上方
        const x = Math.min(
          rect.left + rect.width / 2 - 48, // 按钮宽约 96px，居中偏移
          window.innerWidth - 100,
        );
        const y = rect.top - 44; // 浮层高度约 36px + 8px 间距

        setSelectedText(text);
        setFloatPosition({ x, y });
        // } else {
        //   setSelectedText('');
        //   setFloatPosition(null);
      }
    };

    const container = containerRef.current;
    container.addEventListener('mouseup', handleSelection);

    const handleClickOutside = () => {
      // clearSelection();
      const selection = window.getSelection();
      if (selection?.toString().trim() === '') {
        clearSelection();
      }
    };

    window.addEventListener('click', handleClickOutside);

    return () => {
      container.removeEventListener('mouseup', handleSelection);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [containerRef, enabled, onAsk]);

  const clearSelection = () => {
    console.info('Clearing selection...');
    setSelectedText('');
    setFloatPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleAsk = () => {
    console.info(' Asking about selected text:', selectedText);
    if (selectedText) {
      onAsk?.(selectedText);
      clearSelection();
    }
  };

  return {
    selectedText,
    floatPosition,
    clearSelection,
    handleAsk,
    isHighlightActive: !!selectedText,
  };
};

interface HighlightAskButtonProps {
  position: { x: number; y: number } | null;
  onClick: () => void;
}

const HighlightAskButton: React.FC<HighlightAskButtonProps> = ({ position, onClick }) => {
  if (!position) return null;

  return (
    <div
      className="fixed z-50"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <Button onClick={onClick} variant="outline" className="bg-white text-black">
        <MessageSquareQuote /> 询问 AI
      </Button>
    </div>
  );
};

export default HighlightAskButton;
