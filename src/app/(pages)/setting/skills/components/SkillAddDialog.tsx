'use client';

import * as React from 'react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@renderer/components/ui/tabs';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { useTranslation } from 'react-i18next';
import { IconUpload, IconFolder, IconBrandGithub, IconFileZip, IconLink, IconAlertCircle } from '@tabler/icons-react';
import { useSkillsStore } from '@/app/store/skills/store';
import { buildSkillUploadFormData } from './skillUploadFormData';

interface SkillAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SkillAddDialog({ open, onOpenChange }: SkillAddDialogProps) {
  const { t } = useTranslation('setting');
  const { saving, createCustomSkill, refreshSkills } = useSkillsStore();
  const [activeTab, setActiveTab] = useState('zip');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [githubUrl, setGithubUrl] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillDescription, setSkillDescription] = useState('');
  const [skillPrompt, setSkillPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 重置表单
  const resetForm = () => {
    setZipFile(null);
    setFolderFiles([]);
    setGithubUrl('');
    setSkillName('');
    setSkillDescription('');
    setSkillPrompt('');
    setError(null);
    setIsProcessing(false);
  };

  // 处理对话框关闭
  const handleClose = () => {
    if (!isProcessing) {
      resetForm();
      onOpenChange(false);
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    if (!skillName.trim()) {
      setError(t('skills.addDialog.errors.nameRequired'));
      return false;
    }

    if (!skillDescription.trim()) {
      setError(t('skills.addDialog.errors.descriptionRequired'));
      return false;
    }

    switch (activeTab) {
      case 'zip':
        if (!zipFile) {
          setError(t('skills.addDialog.errors.zipRequired'));
          return false;
        }
        if (!zipFile.name.toLowerCase().endsWith('.zip')) {
          setError(t('skills.addDialog.errors.invalidZip'));
          return false;
        }
        break;

      case 'folder':
        if (folderFiles.length === 0) {
          setError(t('skills.addDialog.errors.folderRequired'));
          return false;
        }
        break;

      case 'github':
        if (!githubUrl.trim()) {
          setError(t('skills.addDialog.errors.githubUrlRequired'));
          return false;
        }
        if (!githubUrl.includes('github.com')) {
          setError(t('skills.addDialog.errors.invalidGithubUrl'));
          return false;
        }
        break;
    }

    setError(null);
    return true;
  };

  // 生成技能 slug
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // 处理技能创建
  const handleCreateSkill = async () => {
    if (!validateForm() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const slug = generateSlug(skillName);

      // 根据 activeTab 确定创建方式
      if (activeTab === 'github' && githubUrl) {
        // GitHub 安装：调用安装接口
        const response = await fetch('/api/skills/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: githubUrl,
            uploadMethod: 'github',
            githubUrl,
          }),
        });

        if (!response.ok) {
          throw new Error(t('skills.addDialog.errors.createFailed' as any));
        }
      } else if (activeTab === 'zip' || activeTab === 'folder') {
        const files = activeTab === 'zip' && zipFile ? [zipFile] : folderFiles;
        const formData = buildSkillUploadFormData(activeTab, files);
        const response = await fetch('/api/skills/install', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(t('skills.addDialog.errors.createFailed' as any));
        }
      } else {
        // 手动创建自定义技能：必须有 prompt
        if (!skillPrompt.trim()) {
          setError(t('skills.addDialog.errors.zipRequired' as any)); // reuse existing key
          setIsProcessing(false);
          return;
        }

        await createCustomSkill({
          slug,
          name: skillName,
          description: skillDescription,
          prompt: skillPrompt,
          icon: '⚡',
        });
      }

      await refreshSkills();

      // 成功后才关闭弹窗和重置表单
      resetForm();
      onOpenChange(false);
    } catch (err) {
      // 失败时保留错误信息，不关闭弹窗，让用户可以修正后重试
      const errorMessage = err instanceof Error ? err.message : t('skills.addDialog.errors.createFailed');
      setError(errorMessage);
      // 滚动到错误信息位置
      setTimeout(() => {
        const errorElement = document.querySelector('[data-testid="skill-error"]');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } finally {
      setIsProcessing(false);
    }
  };

  // 创建 input ref
  const zipInputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);

  // 处理 ZIP 文件上传
  const handleZipUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setZipFile(file);
      setError(null);
    }
    // 重置 input value，允许重复选择同一文件
    if (zipInputRef.current) {
      zipInputRef.current.value = '';
    }
  };

  // 处理文件夹上传
  const handleFolderUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setFolderFiles(files);
      setError(null);
    }
    // 重置 input value
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  // 处理 GitHub URL 输入
  const handleGithubUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGithubUrl(e.target.value);
    setError(null);
  };

  // 触发文件选择
  const triggerZipSelect = () => {
    zipInputRef.current?.click();
  };

  // 触发文件夹选择
  const triggerFolderSelect = () => {
    folderInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('skills.addDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('skills.addDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 上传方式选择 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="zip" className="flex items-center gap-2">
                <IconFileZip size={16} />
                {t('skills.addDialog.tabs.zip')}
              </TabsTrigger>
              <TabsTrigger value="folder" className="flex items-center gap-2">
                <IconFolder size={16} />
                {t('skills.addDialog.tabs.folder')}
              </TabsTrigger>
              <TabsTrigger value="github" className="flex items-center gap-2">
                <IconBrandGithub size={16} />
                {t('skills.addDialog.tabs.github')}
              </TabsTrigger>
            </TabsList>

            {/* ZIP 上传 */}
            <TabsContent value="zip" className="space-y-4 mt-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <IconFileZip className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  {t('skills.addDialog.zip.description')}
                </p>
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="hidden"
                  id="zip-upload"
                />
                <Button
                  variant="outline"
                  onClick={triggerZipSelect}
                  className="cursor-pointer"
                >
                  <IconUpload className="mr-2 h-4 w-4" />
                  {zipFile ? zipFile.name : t('skills.addDialog.zip.selectFile')}
                </Button>
                {zipFile && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t('skills.addDialog.selectedFile')}: {zipFile.name}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 文件夹上传 */}
            <TabsContent value="folder" className="space-y-4 mt-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <IconFolder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  {t('skills.addDialog.folder.description')}
                </p>
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  onChange={handleFolderUpload}
                  className="hidden"
                  id="folder-upload"
                  // @ts-expect-error - webkitdirectory is not in standard types but supported by browsers
                  webkitdirectory=""
                />
                <Button
                  variant="outline"
                  onClick={triggerFolderSelect}
                  className="cursor-pointer"
                >
                  <IconUpload className="mr-2 h-4 w-4" />
                  {t('skills.addDialog.folder.selectFolder')}
                </Button>
                {folderFiles.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t('skills.addDialog.selectedFiles')}: {folderFiles.length} {t('skills.addDialog.files')}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* GitHub 链接 */}
            <TabsContent value="github" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <IconBrandGithub className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('skills.addDialog.github.description')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github-url">{t('skills.addDialog.github.urlLabel')}</Label>
                  <div className="relative">
                    <IconLink className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                      id="github-url"
                      placeholder={t('skills.addDialog.github.urlPlaceholder')}
                      value={githubUrl}
                      onChange={handleGithubUrlChange}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('skills.addDialog.github.urlHint')}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* 技能基本信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('skills.addDialog.skillInfo')}</h3>

            <div className="space-y-2">
              <Label htmlFor="skill-name">{t('skills.addDialog.fields.name')}</Label>
              <Input
                id="skill-name"
                placeholder={t('skills.addDialog.fields.namePlaceholder')}
                value={skillName}
                onChange={(e) => {
                  setSkillName(e.target.value);
                  setError(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-description">{t('skills.addDialog.fields.description')}</Label>
              <Input
                id="skill-description"
                placeholder={t('skills.addDialog.fields.descriptionPlaceholder')}
                value={skillDescription}
                onChange={(e) => {
                  setSkillDescription(e.target.value);
                  setError(null);
                }}
              />
            </div>
          </div>

          {/* 错误信息 */}
          {error && (
            <div
              data-testid="skill-error"
              className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive"
            >
              <IconAlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={handleCreateSkill}
              disabled={saving || isProcessing}
              className="min-w-24"
            >
              {isProcessing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('skills.addDialog.processing')}
                </>
              ) : (
                t('skills.addDialog.createSkill')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
