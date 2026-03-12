'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Switch } from '@renderer/components/ui/switch';
import { Button } from '@renderer/components/ui/button';
import { IconTrash, IconLock, IconSettings } from '@tabler/icons-react';
import type { SkillResponse, SkillSource } from '@typings/skill';
import { useTranslation } from 'react-i18next';

interface SkillCardProps {
  skill: SkillResponse;
  onToggle: (slug: string, isEnabled: boolean) => void;
  onDelete?: (slug: string) => void;
  saving?: boolean;
}

const sourceColors: Record<SkillSource, string> = {
  official: 'bg-green-100 text-green-800',
  community: 'bg-blue-100 text-blue-800',
  custom: 'bg-purple-100 text-purple-800',
};

export function SkillCard({ skill, onToggle, onDelete, saving = false }: SkillCardProps) {
  const { t } = useTranslation('setting');
  const isOfficial = skill.source === 'official';

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">

            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold leading-tight mb-1">
                {skill.name}
              </CardTitle>

              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={sourceColors[skill.source as SkillSource] || sourceColors.custom}>
                  {t(`skills.sources.${skill.source}` as any) || skill.source}
                </Badge>
                {isOfficial && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <IconLock size={12} />
                    {t('skills.sources.officialProtected')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {onDelete && !isOfficial && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(skill.slug)}
                disabled={saving}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <IconTrash size={16} />
              </Button>
            )}

            <Switch
              checked={skill.isEnabled}
              onCheckedChange={(checked) => onToggle(skill.slug, checked)}
              disabled={saving}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm leading-relaxed">{skill.description}</p>
        <p className="flex items-center gap-2 mt-4">
        {skill.skillPath}
        </p>
      </CardContent>
    </Card>
  );
}