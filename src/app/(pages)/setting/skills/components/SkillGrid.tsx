'use client';

import * as React from 'react';
import { SkillCard } from './SkillCard';
import { useSkillsStore } from '@/app/store/skills/store';
import type { SkillResponse } from '@typings/skill';
import { useTranslation } from 'react-i18next';

interface SkillGridProps {
  skills: SkillResponse[];
  onToggle: (skillId: number, isEnabled: boolean) => void;
  onDelete?: (skillId: number) => void;
}

export function SkillGrid({ skills, onToggle, onDelete }: SkillGridProps) {
  const { saving } = useSkillsStore();
  const { t } = useTranslation('setting');
  
  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-medium mb-2">{t('skills.noSkillsFound')}</h3>
        <p className="text-sm">{t('skills.adjustSearch')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
      {skills.map((skill) => (
        <SkillCard
          key={skill.id}
          skill={skill}
          onToggle={onToggle}
          onDelete={onDelete}
          saving={saving}
        />
      ))}
    </div>
  );
}