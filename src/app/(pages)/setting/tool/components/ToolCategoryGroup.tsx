'use client';

import { useTranslation } from 'react-i18next';
import { ToolCard } from './ToolCard';
import { CATEGORY_ICON_MAP } from './toolIcons';
import type { ToolMetadata, ToolCategory } from '@/types/tool/metadata';

interface ToolCategoryGroupProps {
  category: ToolCategory;
  tools: ToolMetadata[];
}

export function ToolCategoryGroup({ category, tools }: ToolCategoryGroupProps) {
  const { t } = useTranslation('setting');

  if (tools.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-primary">{CATEGORY_ICON_MAP[category]}</div>
        <h3 className="text-sm font-semibold">{t(`tool.categories.${category}`)}</h3>
        <span className="text-xs text-muted-foreground">({tools.length})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map((tool) => (
          <ToolCard key={tool.name} tool={tool} />
        ))}
      </div>
    </div>
  );
}
