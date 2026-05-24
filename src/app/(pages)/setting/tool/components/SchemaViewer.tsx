'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@renderer/components/ui/collapsible';
import { Badge } from '@renderer/components/ui/badge';
import type { SchemaProperty } from '@/types/tool/metadata';

interface SchemaViewerProps {
  parameters: SchemaProperty[];
}

export function SchemaViewer({ parameters }: SchemaViewerProps) {
  const { t } = useTranslation('setting');
  const [open, setOpen] = useState(false);

  if (parameters.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic mt-2">
        {t('tool.builtin.noParams', '无参数')}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 cursor-pointer">
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        <span>{t('tool.builtin.paramCount', { count: parameters.length })}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-1.5">
          {parameters.map((param) => (
            <div key={param.name} className="flex items-start gap-2 text-xs">
              <span className="font-mono text-foreground min-w-[100px] truncate" title={param.name}>
                {param.name}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">
                {param.type}
              </Badge>
              {param.required && (
                <span className="text-red-500 text-[10px] shrink-0">*</span>
              )}
              <span className="text-muted-foreground truncate" title={param.description}>
                {param.description}
              </span>
              {param.enum && (
                <div className="flex gap-0.5 flex-wrap">
                  {param.enum.map((e) => (
                    <Badge key={e} variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {e}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
