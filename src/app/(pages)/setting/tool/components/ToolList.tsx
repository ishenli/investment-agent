'use client';

import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@renderer/components/ui/input';
import { Badge } from '@renderer/components/ui/badge';
import { ToolCategoryGroup } from './ToolCategoryGroup';
import type { ToolMetadata, ToolCategory } from '@/types/tool/metadata';
import { CATEGORY_ORDER } from '@/types/tool/metadata';

export function ToolList() {
  const { t } = useTranslation('setting');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all');
  const [builtinTools, setBuiltinTools] = useState<ToolMetadata[]>([]);
  const [businessTools, setBusinessTools] = useState<ToolMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await fetch('/api/tools');
        const result = await response.json();
        if (result.success) {
          setBuiltinTools(result.data.builtinTools || []);
          setBusinessTools(result.data.businessTools || []);
        }
      } catch {
        // silent fail – tools tab simply shows empty
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, []);

  const allTools = useMemo(() => [...builtinTools, ...businessTools], [builtinTools, businessTools]);

  const filteredTools = useMemo(() => {
    let tools = allTools;

    if (activeCategory !== 'all') {
      tools = tools.filter((t) => t.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tools = tools.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }

    return tools;
  }, [allTools, activeCategory, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<ToolCategory, ToolMetadata[]>();
    for (const tool of filteredTools) {
      const arr = map.get(tool.category) ?? [];
      arr.push(tool);
      map.set(tool.category, arr);
    }
    const result: [ToolCategory, ToolMetadata[]][] = [];
    for (const cat of CATEGORY_ORDER) {
      const tools = map.get(cat);
      if (tools && tools.length > 0) {
        result.push([cat, tools]);
      }
    }
    return result;
  }, [filteredTools]);

  const allCategories = useMemo(() => {
    const cats = new Set<ToolCategory>();
    for (const t of allTools) cats.add(t.category);
    return CATEGORY_ORDER.filter((c) => cats.has(c));
  }, [allTools]);

  const categoryCounts = useMemo(() => {
    const map = new Map<ToolCategory, number>();
    for (const t of allTools) {
      map.set(t.category, (map.get(t.category) || 0) + 1);
    }
    return map;
  }, [allTools]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-sm text-muted-foreground">{t('tool.builtin.loading', '加载工具列表...')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('tool.builtin.searchPlaceholder', '搜索工具名称或描述...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={activeCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setActiveCategory('all')}
        >
          {t('tool.builtin.all', '全部')} ({allTools.length})
        </Badge>
        {allCategories.map((cat) => (
          <Badge
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActiveCategory(cat)}
          >
            {t(`tool.categories.${cat}`)} ({categoryCounts.get(cat) ?? 0})
          </Badge>
        ))}
      </div>

      {/* 工具列表 */}
      {filteredTools.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          {t('tool.builtin.empty', '未找到匹配的工具')}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, tools]) => (
            <ToolCategoryGroup key={category} category={category} tools={tools} />
          ))}
        </div>
      )}
    </div>
  );
}
