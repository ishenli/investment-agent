'use client';

import { useState } from 'react';
import { Markdown } from '@lobehub/ui';
import { Flexbox } from 'react-layout-kit';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Input } from '@renderer/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Calendar } from '@renderer/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useStockStore } from '@renderer/store/stock/store';
import { stockChatSelectors } from '@renderer/store/stock/slices/chat/selector';
import StockChat from './components/StockChat';
import { Conversation, ConversationScrollButton } from '@renderer/components/ai-elements/conversation';

export default function StockAnalysisPage() {
  const [formData, setFormData] = useState({
    stockSymbol: 'AAPL',
    analysisDate: new Date().toISOString().split('T')[0],
    analysts: ['market'],
    researchDepth: 3,
    llmProvider: 'ant',
    llmModel: 'Kimi-K2-Instruct',
    marketType: '美股',
  });

  const [error, setError] = useState<string | null>(null);
  const analyzeStock = useStockStore((state) => state.analyzeStock);
  const messages = useStockStore((state) => stockChatSelectors.currentMessage(state));
  const loading = useStockStore((state) => stockChatSelectors.isLoading(state));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'number' ? Number(value) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const handleAnalystsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const analystsArray = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item);
    setFormData((prev) => ({
      ...prev,
      analysts: analystsArray,
    }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      setFormData((prev) => ({
        ...prev,
        analysisDate: formattedDate,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // const response = await fetch(`/api/stock`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(formData),
      // });

      // const data = await response.json();
      await analyzeStock(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className="py-4 px-4">
      <div className="max-w-6xl mx-auto">
        <Flexbox horizontal gap={12}>
          {/* Left sidebar - fixed width */}
          <div className="w-60 shrink-0">
            <div className="bg-white shadow rounded-lg p-6">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label
                      htmlFor="stockSymbol"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      股票代码 *
                    </label>
                    <Input
                      type="text"
                      id="stockSymbol"
                      name="stockSymbol"
                      value={formData.stockSymbol}
                      onChange={handleChange}
                      required
                      placeholder="例如: AAPL"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="analysisDate"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      分析日期 *
                    </label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !formData.analysisDate && 'text-muted-foreground',
                          )}
                        >
                          {formData.analysisDate ? (
                            format(new Date(formData.analysisDate), 'yyyy年MM月dd日', {
                              locale: zhCN,
                            })
                          ) : (
                            <span>选择日期</span>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-auto p-0" align="start">
                        <Calendar
                          selected={new Date(formData.analysisDate)}
                          onSelect={(date: Date | undefined) => handleDateChange(date)}
                          initialFocus
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <label
                      htmlFor="marketType"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      市场类型
                    </label>
                    <Select
                      name="marketType"
                      value={formData.marketType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, marketType: value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择市场类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="美股">美股</SelectItem>
                        <SelectItem value="港股">港股</SelectItem>
                        <SelectItem value="A股">A股</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label
                      htmlFor="researchDepth"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      研究深度
                    </label>
                    <Input
                      type="number"
                      id="researchDepth"
                      name="researchDepth"
                      min="1"
                      max="10"
                      value={formData.researchDepth}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="llmModel"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      LLM模型
                    </label>
                    <Input
                      type="text"
                      id="llmModel"
                      name="llmModel"
                      value={formData.llmModel}
                      onChange={handleChange}
                      placeholder="例如: Kimi-K2-Instruct"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="analysts"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    分析师列表 (用逗号分隔)
                  </label>
                  <textarea
                    id="analysts"
                    name="analysts"
                    value={formData.analysts.join(', ')}
                    onChange={handleAnalystsChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如: market, news, risk"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    }`}
                  >
                    {loading ? '分析中...' : '开始分析'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right content - flexible width */}
          <div className="grow">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-8">
                  <h3 className="text-blue-800 font-medium">正在分析中...</h3>
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                  <h3 className="text-red-800 font-medium">错误</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              )}

              {messages.length > 0 && <StockChat data={messages} />}

              {/* Fallback state when there's no content */}
              {!error && !messages.length && !loading && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">暂无分析结果</h3>
                  <p className="text-gray-500 max-w-md">
                    请输入股票信息并点击&quot;开始分析&quot;按钮获取详细的股票分析报告。
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </Flexbox>
      </div>
    </div>
  );
}
