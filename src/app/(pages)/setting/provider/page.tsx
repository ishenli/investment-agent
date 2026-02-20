'use client';

import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Textarea } from '@renderer/components/ui/textarea';
import { Badge } from '@renderer/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Toggle } from '@renderer/components/ui/toggle';
import { Switch } from '@renderer/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemGroup,
} from '@renderer/components/ui/item';
import { useState, useEffect } from 'react';
import { useModelProviderStore } from '@/app/store/modelProvider';
import { ModelProvider, ProviderModel } from '@/types/modelProvider';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconCheck,
} from '@tabler/icons-react';
import clsx from 'clsx';

type ProviderSettingsProps = object;

export default function ProviderSettings(
  {
    // Add props if needed
  }: ProviderSettingsProps,
) {
  const {
    providers,
    models,
    activeProviderId,
    loading,
    saving,
    error,
    mode,
    draftProvider,
    draftModel,
    errors,
    fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    setProviderActive,
    setActiveProvider,
    fetchModels,
    createModel,
    updateModel,
    deleteModel,
    setModelActive,
    resetForm,
    setDraftProvider,
    setDraftModel,
    setFormMode,
    setFormError,
    clearFormError,
  } = useModelProviderStore();

  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // 默认选中第一个服务商
  useEffect(() => {
    if (!activeProviderId && providers.length > 0) {
      setActiveProvider(providers[0].id);
    }
  }, [activeProviderId, providers, setActiveProvider]);

  useEffect(() => {
    if (activeProviderId) {
      fetchModels(activeProviderId);
    } else {
      setActiveProvider(null);
    }
  }, [activeProviderId, fetchModels]);

  const activeProvider = providers.find((p) => p.id === activeProviderId);

  const handleSelectProvider = (id: number) => {
    setActiveProvider(id);
    setFormMode('view');
  };

  const handleCreateProvider = () => {
    resetForm();
    setFormMode('create');
    setProviderDialogOpen(true);
  };

  const handleEditProvider = () => {
    setFormMode('edit');
    setProviderDialogOpen(true);
  };

  const handleDeleteProvider = async () => {
    if (activeProviderId && confirm('确定要删除此服务商吗？')) {
      await deleteProvider(activeProviderId);
      resetForm();
    }
  };

  const handleSaveProvider = async () => {
    // Validate
    const errors: Record<string, string> = {};

    if (!draftProvider.name?.trim()) {
      errors.name = '名称不能为空';
    }
    if (!draftProvider.slug?.trim()) {
      errors.slug = 'Slug不能为空';
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(draftProvider.slug)) {
      errors.slug = 'Slug只能包含字母、数字、连字符、下划线和点';
    }
    if (!draftProvider.baseUrl?.trim()) {
      errors.baseUrl = 'Base URL不能为空';
    } else if (!/^https:\/\//.test(draftProvider.baseUrl)) {
      errors.baseUrl = 'URL必须使用https协议';
    }

    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([field, error]) => setFormError(field, error));
      return;
    } else {
      Object.keys(errors).forEach((field) => clearFormError(field));
    }

    if (mode === 'create') {
      await createProvider(
        draftProvider as Partial<ModelProvider> & Pick<ModelProvider, 'name' | 'slug' | 'baseUrl'>,
      );
    } else if (mode === 'edit' && activeProviderId) {
      await updateProvider(activeProviderId, draftProvider);
    }

    if (!error) {
      setProviderDialogOpen(false);
      resetForm();
    }
  };

  const handleCreateModel = () => {
    resetForm();
    setFormMode('model-create');
    setModelDialogOpen(true);
  };

  const handleEditModel = (model: ProviderModel) => {
    setDraftModel(model);
    setFormMode('model-edit');
    setModelDialogOpen(true);
  };

  const handleDeleteModel = async (id: number) => {
    if (confirm('确定要删除此模型吗？')) {
      await deleteModel(id);
    }
  };

  const handleSaveModel = async () => {
    const errors: Record<string, string> = {};

    if (!draftModel.slug?.trim()) {
      errors.slug = 'Model Slug不能为空';
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(draftModel.slug)) {
      errors.slug = 'Slug只能包含字母、数字、连字符、下划线和点';
    }
    if (!draftModel.name?.trim()) {
      errors.name = '模型名称不能为空';
    }

    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([field, error]) => setFormError(field, error));
      return;
    } else {
      Object.keys(errors).forEach((field) => clearFormError(field));
    }

    if (mode === 'model-create') {
      await createModel(
        draftModel as Partial<ProviderModel> & Pick<ProviderModel, 'slug' | 'name'>,
      );
    } else if (mode === 'model-edit') {
      const modelId = draftModel.id;
      if (modelId) {
        await updateModel(modelId, draftModel);
      }
    }

    if (!error) {
      setModelDialogOpen(false);
      resetForm();
    }
  };

  const toggleApiKeyVisibility = (providerId: number) => {
    setShowApiKey((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const maskApiKey = (key?: string | null) => {
    if (!key || key.length <= 4) return key || '';
    return `••••${key.slice(-4)}`;
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">模型服务商管理</h1>
        <Button onClick={handleCreateProvider} className="gap-2">
          <IconPlus className="h-4 w-4" />
          添加服务商
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100dvh-200px)]">
        {/* Providers List */}
        <Card className="w-full md:w-80 flex flex-col">
          <CardHeader>
            <CardTitle>服务商列表</CardTitle>
            <CardDescription>选择服务商查看或编辑</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <ItemGroup className="gap-1">
              {loading && providers.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-muted/25">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-20 bg-muted rounded-md animate-pulse" />
                        <div className="h-2.5 w-12 bg-muted/50 rounded-md animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : providers.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                  暂无服务商，点击上方按钮添加
                </div>
              ) : (
                providers.map((provider) => (
                  <Item
                    key={provider.id}
                    onClick={() => handleSelectProvider(provider.id)}
                    className={clsx(
                      'cursor-pointer transition-all duration-200 ease-out',
                      activeProviderId === provider.id
                        ? 'bg-accent/50 border-primary/20'
                        : 'hover:bg-muted/40 border-transparent',
                    )}
                    variant="outline"
                    size="sm"
                  >
                    <ItemContent>
                      <ItemTitle
                        className={clsx(
                          activeProviderId === provider.id
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        {provider.name}
                      </ItemTitle>
                      <ItemDescription className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[11px]">{provider.slug}</span>
                        {provider.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                            激活
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60">
                            <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full" />
                            未激活
                          </span>
                        )}
                      </ItemDescription>
                    </ItemContent>
                    {activeProviderId === provider.id && (
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
                        <IconCheck className="w-3 h-3" />
                      </div>
                    )}
                  </Item>
                ))
              )}
            </ItemGroup>
          </CardContent>
        </Card>

        {/* Provider Config */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            {activeProvider ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{activeProvider.name}</CardTitle>
                    <CardDescription>
                      {activeProvider.description || activeProvider.slug}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleEditProvider}>
                      <IconEdit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeleteProvider}>
                      <IconTrash className="h-4 w-4" />
                    </Button>
                    <Toggle
                      pressed={activeProvider.isActive}
                      onPressedChange={(pressed) => setProviderActive(activeProvider.id, pressed)}
                      aria-label={activeProvider.isActive ? '停用' : '激活'}
                      className={clsx(
                        'gap-2 px-3 py-1.5 h-auto text-xs font-medium transition-colors',
                        activeProvider.isActive
                          ? 'bg-primary/10 text-primary hover:bg-primary/20 data-[state=on]:bg-primary/15'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80',
                      )}
                    >
                      <span
                        className={clsx(
                          'w-2 h-2 rounded-full',
                          activeProvider.isActive
                            ? 'bg-primary animate-pulse'
                            : 'bg-muted-foreground/50',
                        )}
                      />
                      {activeProvider.isActive ? '已激活' : '未激活'}
                    </Toggle>
                  </div>
                </div>
              </>
            ) : (
              <>
                <CardTitle>服务商配置</CardTitle>
                <CardDescription>选择一个服务商查看详情</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent
            className={clsx(
              'flex-1 overflow-y-auto',
              !activeProvider && 'flex items-center justify-center',
            )}
          >
            {activeProvider ? (
              <div className="space-y-6">
                {/* Provider Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">基本信息</h3>
                  <div className="grid gap-4">
                    <div>
                      <Label>服务名称</Label>
                      <div className="mt-1 text-sm">{activeProvider.name}</div>
                    </div>
                    <div>
                      <Label>Slug</Label>
                      <div className="mt-1 text-sm font-mono">{activeProvider.slug}</div>
                    </div>
                    <div>
                      <Label>Base URL</Label>
                      <div className="mt-1 text-sm break-all">{activeProvider.baseUrl}</div>
                    </div>
                    <div>
                      <Label>API Key</Label>
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-muted">
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono tracking-wide">
                            {showApiKey[activeProvider.id]
                              ? activeProvider.apiKey
                              : maskApiKey(activeProvider.apiKey)}
                          </code>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleApiKeyVisibility(activeProvider.id)}
                            >
                              {showApiKey[activeProvider.id] ? (
                                <IconEyeOff className="h-4 w-4" />
                              ) : (
                                <IconEye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {activeProvider.description && (
                      <div>
                        <Label>描述</Label>
                        <div className="mt-1 text-sm">{activeProvider.description}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Models Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">模型列表</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateModel}
                      className="gap-2"
                    >
                      <IconPlus className="h-4 w-4" />
                      添加模型
                    </Button>
                  </div>
                  {models.length === 0 ? (
                    <div className="py-12 px-8 text-center border-2 border-dashed rounded-xl bg-muted/25">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                        <div className="w-6 h-6 border-2 border-dashed border-muted-foreground/30 rounded-full" />
                      </div>
                      <p className="text-sm font-medium mb-1">暂无模型</p>
                      <p className="text-xs text-muted-foreground">点击上方按钮添加第一个模型</p>
                    </div>
                  ) : (
                    <ItemGroup className="gap-2">
                      {models.map((model) => (
                        <Item
                          key={model.id}
                          variant="outline"
                          className="group hover:border-primary/50 hover:shadow-sm transition-all duration-200"
                        >
                          <ItemContent>
                            <ItemTitle>{model.name}</ItemTitle>
                            <ItemDescription className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] px-1.5 py-0.5 bg-muted/50 rounded">
                                {model.slug}
                              </span>
                              {model.contextWindow && (
                                <Badge variant="outline" className="text-[10px]">
                                  {model.contextWindow.toLocaleString()} tokens
                                </Badge>
                              )}
                              {model.supportsVision && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Vision
                                </Badge>
                              )}
                              {model.supportsFunctionCalling && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Functions
                                </Badge>
                              )}
                            </ItemDescription>
                          </ItemContent>
                          <div className="flex items-center gap-2 ml-4">
                            <Switch
                              checked={model.isActive}
                              onCheckedChange={(checked) => setModelActive(model.id, checked)}
                              className="data-[state=checked]:bg-primary"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleEditModel(model)}
                            >
                              <IconEdit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteModel(model.id)}
                            >
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </Item>
                      ))}
                    </ItemGroup>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <div className="py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-4">
                    <IconArrowRight className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">还未选择服务商</h3>
                  <p className="text-sm max-w-sm mx-auto mb-6">
                    请从左侧列表中选择一个服务商,或点击右上角&quot;添加服务商&quot;创建新的
                  </p>
                  <Button onClick={handleCreateProvider} variant="default" className="gap-2">
                    <IconPlus className="h-4 w-4" />
                    添加第一个服务商
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provider Dialog */}
      <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? '添加服务商' : '编辑服务商'}</DialogTitle>
            <DialogDescription>
              {mode === 'create' ? '添加一个新的模型服务商配置' : '编辑服务商配置信息'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                服务名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={draftProvider.name || ''}
                onChange={(e) => setDraftProvider({ name: e.target.value })}
                placeholder="例如: OpenAI"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slug"
                value={draftProvider.slug || ''}
                onChange={(e) => setDraftProvider({ slug: e.target.value })}
                placeholder="openai"
                disabled={mode === 'edit'}
                className={errors.slug ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                只能包含字母、数字、连字符、下划线和点
              </p>
              {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="baseUrl">
                Base URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="baseUrl"
                value={draftProvider.baseUrl || ''}
                onChange={(e) => setDraftProvider({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className={errors.baseUrl ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">必须使用 https 协议</p>
              {errors.baseUrl && <p className="text-sm text-destructive">{errors.baseUrl}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={draftProvider.apiKey || ''}
                onChange={(e) => setDraftProvider({ apiKey: e.target.value })}
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground">留空则保持原密钥不变（编辑时）</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={draftProvider.description || ''}
                onChange={(e) => setDraftProvider({ description: e.target.value })}
                placeholder="服务商的描述信息..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveProvider} disabled={saving}>
              {saving ? '保存中...' : mode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Model Dialog */}
      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{mode === 'model-create' ? '添加模型' : '编辑模型'}</DialogTitle>
            <DialogDescription>
              {mode === 'model-create' ? '为服务商添加一个新的模型' : '编辑模型的配置信息'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="modelName">
                模型名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modelName"
                value={draftModel.name || ''}
                onChange={(e) => setDraftModel({ name: e.target.value })}
                placeholder="GPT-4"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="modelSlug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                id="modelSlug"
                value={draftModel.slug || ''}
                onChange={(e) => setDraftModel({ slug: e.target.value })}
                placeholder="gpt-4"
                className={errors.slug ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                只能包含字母、数字、连字符、下划线和点
              </p>
              {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contextWindow">上下文窗口</Label>
              <Input
                required
                id="contextWindow"
                type="number"
                value={draftModel.contextWindow ?? ''}
                onChange={(e) =>
                  setDraftModel({
                    contextWindow: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="128000"
                min="1"
                max="1000000"
              />
              <p className="text-xs text-muted-foreground">模型支持的上下文窗口大小（tokens）</p>
            </div>
            {/* <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="supportVision" className="cursor-pointer">
                  支持 Vision
                </Label>
                <div className="flex items-center gap-2">
                  <Toggle
                    id="supportVision"
                    pressed={draftModel.supportsVision || false}
                    onPressedChange={(pressed) => setDraftModel({ supportsVision: pressed })}
                  />
                  <span className="text-sm text-muted-foreground">视觉理解能力</span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supportFunction" className="cursor-pointer">
                  支持函数调用
                </Label>
                <div className="flex items-center gap-2">
                  <Toggle
                    id="supportFunction"
                    pressed={draftModel.supportsFunctionCalling || false}
                    onPressedChange={(pressed) =>
                      setDraftModel({ supportsFunctionCalling: pressed })
                    }
                  />
                  <span className="text-sm text-muted-foreground">Function Calling</span>
                </div>
              </div>
            </div> */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveModel} disabled={saving}>
              {saving ? '保存中...' : mode === 'model-create' ? '添加' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
