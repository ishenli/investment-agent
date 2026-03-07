'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Switch } from '@renderer/components/ui/switch';
import { Button } from '@renderer/components/ui/button';
import { IconTrash, IconLock, IconSettings } from '@tabler/icons-react';
import type { SkillResponse, SkillCategory, SkillSource } from '@typings/skill';
import { useTranslation } from 'react-i18next';

interface SkillCardProps {
  skill: SkillResponse;
  onToggle: (skillId: number, isEnabled: boolean) => void;
  onDelete?: (skillId: number) => void;
  saving?: boolean;
}

const categoryColors: Record<SkillCategory, string> = {
  brainstorming: 'bg-blue-100 text-blue-800',
  debugging: 'bg-red-100 text-red-800',
  tdd: 'bg-green-100 text-green-800',
  'code-review': 'bg-purple-100 text-purple-800',
  testing: 'bg-indigo-100 text-indigo-800',
  documentation: 'bg-yellow-100 text-yellow-800',
  optimization: 'bg-teal-100 text-teal-800',
  refactoring: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

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
                <Badge
                  className={
                    categoryColors[skill.category as SkillCategory] || categoryColors.other
                  }
                >
                  {t(`skills.categories.${skill.category}` as any) || skill.category}
                </Badge>
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
                onClick={() => onDelete(skill.id)}
                disabled={saving}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <IconTrash size={16} />
              </Button>
            )}

            <Switch
              checked={skill.isEnabled}
              onCheckedChange={(checked) => onToggle(skill.id, checked)}
              disabled={saving}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm leading-relaxed">{skill.description}</p>
      </CardContent>
    </Card>
  );
}
