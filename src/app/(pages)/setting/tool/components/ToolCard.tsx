'use client';

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { SchemaViewer } from './SchemaViewer';
import { CATEGORY_ICON_MAP } from './toolIcons';
import type { ToolMetadata } from '@/types/tool/metadata';

interface ToolCardProps {
  tool: ToolMetadata;
}

export function ToolCard({ tool }: ToolCardProps) {
  const { t } = useTranslation('setting');

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 group">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-muted-foreground shrink-0">
              {CATEGORY_ICON_MAP[tool.category]}
            </div>
            <span className="font-semibold text-sm truncate" title={tool.name}>
              {tool.name}
            </span>
          </div>
          <Badge
            variant={tool.source === 'builtin' ? 'outline' : 'secondary'}
            className="text-[10px] px-1.5 py-0 h-5 shrink-0 ml-2"
          >
            {tool.source === 'builtin'
              ? t('tool.builtin.sourceBuiltin', '内置')
              : t('tool.builtin.sourceBusiness', '业务')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
          {tool.description}
        </p>
        <SchemaViewer parameters={tool.parameters} />
      </CardContent>
    </Card>
  );
}
