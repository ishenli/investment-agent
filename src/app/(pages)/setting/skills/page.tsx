'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Input } from '@renderer/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { Button } from '@renderer/components/ui/button';
import { IconSearch, IconPlus, IconRefresh } from '@tabler/icons-react';
import { SkillGrid } from './components/SkillGrid';
import { SkillAddDialog } from './components/SkillAddDialog';
import { useSkillsStore } from '@/app/store/skills/store';
import type { SkillSource } from '@typings/skill';
import { useTranslation } from 'react-i18next';

export default function SkillsPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { t } = useTranslation('setting');

  const {
    // skills,
    loading,
    saving,
    // error,
    searchQuery,
    selectedSource,
    filteredSkills,
    sources,
    fetchSkills,
    toggleSkill,
    createCustomSkill,
    deleteCustomSkill,
    setSearchQuery,
    setSelectedSource,
    // setError,
    // clearError,
  } = useSkillsStore();

  // 页面加载时获取技能
  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleToggle = async (slug: string, isEnabled: boolean) => {
    try {
      await toggleSkill(slug, isEnabled);
      // 的成功提示
      console.log(isEnabled ? t('skills.toggle.enabled') : t('skills.toggle.disabled'));
    } catch (error) {
      console.error(t('skills.toggle.failed'), error);
    }
  };

  const handleDelete = async (slug: string) => {
    try {
      await deleteCustomSkill(slug);
      console.log(t('skills.delete.success'));
    } catch (error) {
      console.error(t('skills.delete.failed'), error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleSourceChange = (value: string) => {
    setSelectedSource(value === 'all' ? null : value as SkillSource);
  };

  const handleRefresh = () => {
    fetchSkills();
  };

  const sourceTabs = [
    { value: 'all', label: t('skills.all' as any) || 'All' },
    ...sources().map(src => ({
      value: src.value,
      label: `${t(`skills.sources.${src.value}` as any) || src.value} (${src.count})`,
    })),
  ];

  return (
    <div className="container mx-auto px-2 max-w-7xl">
      <SkillAddDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{t('skills.title')}</h1>
        <p className="">{t('skills.description')}</p>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2" size={20} />
            <Input
              placeholder={t('skills.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            onClick={handleRefresh}
            disabled={loading || saving}
            variant="outline"
            className="flex items-center gap-2"
          >
            <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
            {t('skills.refresh')}
          </Button>

          <Button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2"
          >
            <IconPlus size={16} />
            {t('skills.addSkill')}
          </Button>
        </div>

        {/* 来源标签 */}
        <Tabs
          value={selectedSource || 'all'}
          onValueChange={handleSourceChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            {sourceTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 技能列表 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            {t('skills.skillsList')} ({filteredSkills().length})
          </h2>
          {loading && (
            <div className="text-sm">{t('skills.loading')}</div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          </div>
        ) : (
          <SkillGrid
            skills={filteredSkills()}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}