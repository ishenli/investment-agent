'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { SearchIcon } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@renderer/components/ui/command';
import { get } from '@/app/lib/request/index';

interface AssetSearchResult {
  id: string;
  title: string;
  description: string;
  type: string;
  source: string;
}

export function GlobalSearch() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<AssetSearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Cmd+K / Ctrl+K keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Debounced search
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await get<{
          data: { results: AssetSearchResult[] };
        }>(`/api/search/local?query=${encodeURIComponent(query)}&pageSize=10`);
        // Filter to only asset meta results
        const assetResults = (response.data?.results || []).filter((r) =>
          r.id.startsWith('meta-'),
        );
        setResults(assetResults);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (resultId: string) => {
    const realId = resultId.replace('meta-', '');
    setOpen(false);
    setQuery('');
    setResults([]);
    router.push(`/asset-meta/${realId}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <SearchIcon className="size-4" />
        <span className="hidden sm:inline">{t('globalSearch.searchHint')}</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('globalSearch.searchHint')}
        description={t('globalSearch.placeholder')}
      >
        <CommandInput
          placeholder={t('globalSearch.placeholder')}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('loading')}
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <CommandEmpty>{t('globalSearch.noResults')}</CommandEmpty>
          )}
          {results.length > 0 && (
            <CommandGroup heading={t('globalSearch.assets')}>
              {results.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result.id)}
                >
                  <SearchIcon className="mr-2 size-4" />
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    {result.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {result.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
