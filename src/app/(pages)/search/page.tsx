'use client';

import { useState, useRef, useCallback } from 'react';
import { Input } from '@renderer/components/ui/input';
import { Button } from '@renderer/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@renderer/components/ui/dialog';
import { IconSearch, IconLoader, IconWorld, IconDatabase } from '@tabler/icons-react';
import { get } from '@/app/lib/request';
import { SearchResultItem, SearchResponse } from '@/types/search';
import { useTranslation } from 'react-i18next';

export default function SearchPage() {
  const { t } = useTranslation('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'local' | 'web'>('all');
  const [localResults, setLocalResults] = useState<SearchResultItem[]>([]);
  const [webResults, setWebResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [localTotal, setLocalTotal] = useState(0);
  const [webTotal, setWebTotal] = useState(0);

  // 用于跟踪是否已提交搜索
  const [hasSearched, setHasSearched] = useState(false);

  // 用于取消上一次请求
  const abortRef = useRef<AbortController | null>(null);

  const executeSearch = useCallback(
    async (query: string, type: 'all' | 'local' | 'web', page: number) => {
      if (!query.trim()) return;

      // 取消上一次请求
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const pageStr = page.toString();
        const pageSizeStr = pageSize.toString();

        const localPromise =
          type === 'local' || type === 'all'
            ? get<SearchResponse>('/api/search/local', {
                params: { query, page: pageStr, pageSize: pageSizeStr },
              }).then((r) => r.data)
            : null;

        const webPromise =
          type === 'web' || type === 'all'
            ? get<SearchResponse>('/api/search/web', {
                params: { query, page: pageStr, pageSize: pageSizeStr },
              }).then((r) => r.data)
            : null;

        const [localData, webData] = await Promise.all([localPromise, webPromise]);

        if (controller.signal.aborted) return;

        setLocalResults(localData?.results ?? []);
        setLocalTotal(localData?.total ?? 0);
        setWebResults(webData?.results ?? []);
        setWebTotal(webData?.total ?? 0);
        setHasSearched(true);
      } catch (_error) {
        if (controller.signal.aborted) return;
        setError(t('error.searchFailed'));
        setLocalResults([]);
        setWebResults([]);
        setLocalTotal(0);
        setWebTotal(0);
        setHasSearched(false);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [pageSize, t],
  );

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    executeSearch(searchQuery, searchType, 1);
  }, [searchQuery, searchType, executeSearch]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
      executeSearch(searchQuery, searchType, newPage);
    },
    [searchQuery, searchType, executeSearch],
  );

  const handleSearchTypeChange = useCallback(
    (value: string) => {
      const newType = value as 'all' | 'local' | 'web';
      setSearchType(newType);
      if (hasSearched && searchQuery.trim()) {
        setCurrentPage(1);
        executeSearch(searchQuery, newType, 1);
      }
    },
    [hasSearched, searchQuery, executeSearch],
  );

  // 根据当前搜索类型计算分页
  const total = searchType === 'web' ? webTotal : searchType === 'local' ? localTotal : localTotal + webTotal;
  const totalPages = Math.ceil(total / pageSize);

  // 渲染搜索结果卡片列表
  const renderResultsCards = (results: SearchResultItem[], title?: string) => (
    <div className="flex flex-col gap-4">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result) => (
          <Dialog
            key={result.id}
            open={selectedItem?.id === result.id && isDialogOpen}
            onOpenChange={setIsDialogOpen}
          >
            <DialogTrigger asChild>
              <Card
                className="hover:shadow-md transition-shadow relative group cursor-pointer"
                onClick={() => {
                  setSelectedItem(result);
                  setIsDialogOpen(true);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-medium line-clamp-2">
                      {result.title}
                    </CardTitle>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        result.type === 'local'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                      }`}
                    >
                      {result.type === 'local' ? (
                        <>
                          <IconDatabase className="mr-1 size-3" />
                          {t('resultType.local')}
                        </>
                      ) : (
                        <>
                          <IconWorld className="mr-1 size-3" />
                          {t('resultType.web')}
                        </>
                      )}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {result.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{result.source}</span>
                      {result.url && (
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate max-w-[50%]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('result.visitLink')}
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{selectedItem?.title}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      selectedItem?.type === 'local'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                    }`}
                  >
                    {selectedItem?.type === 'local' ? t('resultType.local') : t('resultType.web')}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium">{t('result.source')}</h3>
                  <p className="text-sm text-muted-foreground">{selectedItem?.source}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium">{t('result.description')}</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedItem?.description}</p>
                </div>
                {selectedItem?.url && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-medium">{t('result.link')}</h3>
                    <a
                      href={selectedItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline break-all"
                    >
                      {selectedItem.url}
                    </a>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* 搜索框和选项 */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder={t('placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && searchQuery.trim()) {
                  handleSearch();
                }
              }}
              className="pl-10"
              disabled={isLoading}
            />
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          {/* 搜索类型选项卡 */}
          <Select value={searchType} onValueChange={handleSearchTypeChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('searchType.all')}</SelectItem>
              <SelectItem value="local">{t('searchType.local')}</SelectItem>
              <SelectItem value="web">{t('searchType.web')}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
            {isLoading ? (
              <>
                <IconLoader className="mr-2 size-4 animate-spin" />
                {t('searching')}
              </>
            ) : (
              t('searchButton')
            )}
          </Button>
        </div>
      </div>

      {/* 搜索条件显示 */}
      {hasSearched && searchQuery.trim() && (
        <div className="rounded-lg bg-muted p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{t('condition.label')}</span>
            <span className="rounded bg-background px-2 py-1 font-mono">&quot;{searchQuery}&quot;</span>
            <span className="text-muted-foreground">•</span>
            <span className="rounded bg-background px-2 py-1">
              {searchType === 'all' && t('searchType.all')}
              {searchType === 'local' && t('searchType.local')}
              {searchType === 'web' && t('searchType.web')}
            </span>
          </div>
        </div>
      )}

      {/* 搜索结果 */}
      {error && <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>}

      {hasSearched && searchQuery.trim() && (
        <div className="flex flex-col gap-4">
          {searchType === 'all' ? (
            <>
              {localResults.length > 0 && renderResultsCards(localResults, t('searchType.local'))}
              {webResults.length > 0 && renderResultsCards(webResults, t('searchType.web'))}
              {localResults.length === 0 && webResults.length === 0 && !isLoading && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-medium">{t('empty.noResults')}</div>
                    <div className="text-muted-foreground">{t('empty.suggestion')}</div>
                  </div>
                </div>
              )}
            </>
          ) : searchType === 'local' ? (
            localResults.length > 0 ? (
              renderResultsCards(localResults)
            ) : !isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-medium">{t('empty.noLocalData')}</div>
                  <div className="text-muted-foreground">{t('empty.suggestion')}</div>
                </div>
              </div>
            ) : null
          ) : webResults.length > 0 ? (
            renderResultsCards(webResults)
          ) : !isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-medium">{t('empty.noWebData')}</div>
                <div className="text-muted-foreground">{t('empty.suggestion')}</div>
              </div>
            </div>
          ) : null}

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t('pagination.total', { count: total })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {t('pagination.previous')}
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, startPage + 4);
                    if (endPage - startPage < 4) {
                      startPage = Math.max(1, endPage - 4);
                    }
                    const page = startPage + i;
                    if (page > endPage) return null;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t('pagination.next')}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {t('pagination.pageInfo', { current: currentPage, total: totalPages })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
