'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import {
  IconRobot,
  IconSettings,
  IconCheck,
  IconPlus,
  IconEdit,
  IconTrash,
  IconX,
  IconCirclePlus,
  IconCircleMinus,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Textarea } from '@renderer/components/ui/textarea';
import { Label } from '@renderer/components/ui/label';
import { Input } from '@renderer/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { get, post, put, del } from '@/app/lib/request/index';
import { toast } from 'sonner';
import {
  AgentTypeResponse as Agent,
  CreateAgentRequestType,
  UpdateAgentRequestType,
} from '@typings/agent';
import { useTranslation } from 'react-i18next';

export default function AgentSettingsPage() {
  const { t } = useTranslation('setting');
  // 智能体列表状态
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 编辑状态
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState<Partial<Agent>>({
    name: '',
    slug: '',
    type: 'LOCAL',
    description: '',
    systemRole: '',
    apiKey: '',
    apiUrl: '',
    openingQuestions: [],
  });

  // 保存状态
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 获取所有智能体
  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: { success: boolean; data: Agent[] } = await get('/api/agent');
      if (response.success) {
        setAgents(response.data);
      } else {
        throw new Error('API returned failure');
      }
    } catch (err) {
      console.error('Failed to fetch agents', err);
      setError('获取智能体列表失败');
      toast.error('获取智能体列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateAgent = () => {
    setIsCreating(true);
    setEditingAgent(null);
    setFormData({
      name: '',
      slug: '',
      type: 'LOCAL',
      description: '',
      systemRole: '',
      apiKey: '',
      apiUrl: '',
      openingQuestions: [],
    });
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setIsCreating(false);
    setFormData({
      name: agent.name,
      slug: agent.slug,
      type: agent.type,
      description: agent.description || '',
      systemRole: agent.systemRole || '',
      logo: agent.logo || '',
      apiKey: agent.apiKey,
      apiUrl: agent.apiUrl,
      openingQuestions: agent.openingQuestions,
    });
  };

  const handleCancelEdit = () => {
    setEditingAgent(null);
    setIsCreating(false);
    setFormData({
      name: '',
      slug: '',
      type: 'LOCAL',
      description: '',
      systemRole: '',
      apiKey: '',
      apiUrl: '',
      openingQuestions: [],
    });
  };

  const handleDeleteAgent = async (agentId: number) => {
    if (!confirm('确定要删除这个智能体吗？')) {
      return;
    }

    try {
      const response: { success: boolean; message?: string } = await del(
        `/api/agent?agentId=${agentId}`,
      );
      if (response.success) {
        toast.success('智能体删除成功');
      } else {
        throw new Error(response.message || '删除失败');
      }
      fetchAgents(); // 重新加载列表
    } catch (err) {
      console.error('Failed to delete agent', err);
      toast.error('删除智能体失败');
    }
  };

  const handleChange = (field: keyof Agent, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddOpeningQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      openingQuestions: [...(prev.openingQuestions || []), ''],
    }));
  };

  const handleRemoveOpeningQuestion = (index: number) => {
    setFormData((prev) => {
      const newQuestions = [...(prev.openingQuestions || [])];
      newQuestions.splice(index, 1);
      return {
        ...prev,
        openingQuestions: newQuestions,
      };
    });
  };

  const handleOpeningQuestionChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newQuestions = [...(prev.openingQuestions || [])];
      newQuestions[index] = value;
      return {
        ...prev,
        openingQuestions: newQuestions,
      };
    });
  };

  const handleSaveAgent = async () => {
    try {
      setSaving(true);

      if (editingAgent) {
        // 更新现有智能体
        const response: { success: boolean; data: Agent } = await put(
          `/api/agent?agentId=${editingAgent.id}`,
          {
            ...formData,
            description: formData.description || null,
            systemRole: formData.systemRole || null,
            logo: formData.logo || null,
          },
        );

        if (response.success) {
          toast.success('智能体更新成功');
        } else {
          throw new Error('更新失败');
        }
      } else {
        // 创建新智能体
        const response: { success: boolean; data: Agent } = await post('/api/agent', {
          ...formData,
          description: formData.description || null,
          systemRole: formData.systemRole || null,
          logo: formData.logo || null,
        });

        if (response.success) {
          toast.success('智能体创建成功');
        } else {
          throw new Error('创建失败');
        }
      }

      setSaved(true);
      setEditingAgent(null);
      setIsCreating(false);
      fetchAgents(); // 重新加载列表

      // 3秒后隐藏保存成功提示
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to save agent', err);
      toast.error('保存智能体失败');
    } finally {
      setSaving(false);
    }
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-lg text-muted-foreground">{t('agent.loading', '加载中...')}</div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  // 按类型过滤智能体
  const localAgents = agents.filter((agent) => agent.type === 'LOCAL');
  const lingxiAgents = agents.filter((agent) => agent.type === 'LINGXI');

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('agent.title', '智能体设置')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('agent.description', '管理您的 AI 智能体配置')}
          </p>
        </div>
      </div>

      {isCreating || editingAgent ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconRobot className="h-5 w-5" />
                  {isCreating ? t('agent.form.title.create', '创建智能体') : t('agent.form.title.edit', '编辑 %s').replace('%s', editingAgent?.name || '')}
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">{t('agent.form.fields.name.label', '名称 *')}</Label>
              <Input
                id="agent-name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={t('agent.form.fields.name.placeholder', '输入智能体名称')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-slug">{t('agent.form.fields.slug.label', 'Slug *')}</Label>
              <Input
                id="agent-slug"
                value={formData.slug || ''}
                onChange={(e) => handleChange('slug', e.target.value)}
                placeholder={t('agent.form.fields.slug.placeholder', '输入智能体 Slug')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-type">{t('agent.form.fields.type.label', '类型 *')}</Label>
              <select
                id="agent-type"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.type || 'LOCAL'}
                onChange={(e) => handleChange('type', e.target.value as 'LOCAL' | 'LINGXI')}
              >
                <option value="LOCAL">{t('agent.form.fields.type.local', '本地')}</option>
                <option value="LINGXI">{t('agent.form.fields.type.lingxi', '灵犀')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-description">{t('agent.form.fields.description.label', '描述')}</Label>
              <Input
                id="agent-description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('agent.form.fields.description.placeholder', '输入智能体描述')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-apiKey">{t('agent.form.fields.apiKey.label', 'API密钥 *')}</Label>
              <Input
                id="agent-apiKey"
                value={formData.apiKey || ''}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                placeholder={t('agent.form.fields.apiKey.placeholder', '输入API密钥')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-apiUrl">{t('agent.form.fields.apiUrl.label', 'API地址 *')}</Label>
              <Input
                id="agent-apiUrl"
                value={formData.apiUrl || ''}
                onChange={(e) => handleChange('apiUrl', e.target.value)}
                placeholder={t('agent.form.fields.apiUrl.placeholder', '输入API地址')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-systemRole">{t('agent.form.fields.systemRole.label', '系统提示词')}</Label>
              <Textarea
                id="agent-systemRole"
                value={formData.systemRole || ''}
                onChange={(e) => handleChange('systemRole', e.target.value)}
                placeholder={t('agent.form.fields.systemRole.placeholder', '输入智能体的系统提示词...')}
                className="min-h-[200px]"
              />
              <p className="text-sm text-muted-foreground">{t('agent.form.fields.systemRole.description', '设置智能体的行为准则和角色定位。')}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('agent.form.fields.openingQuestions.label', '开场问题')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOpeningQuestion}
                  className="h-8 px-2"
                >
                  <IconCirclePlus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {(formData.openingQuestions || []).map((question, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={question || ''}
                      onChange={(e) => handleOpeningQuestionChange(index, e.target.value)}
                      placeholder={t('agent.form.fields.openingQuestions.placeholder', '开场问题 %d').replace('%d', (index + 1).toString())}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveOpeningQuestion(index)}
                      className="h-10 w-10 p-0"
                    >
                      <IconCircleMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(formData.openingQuestions || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('agent.form.fields.openingQuestions.noQuestions', '暂无开场问题，点击上方按钮添加')}</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('agent.form.fields.openingQuestions.description', '设置智能体的开场问题，帮助用户快速开始对话。')}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Button onClick={handleSaveAgent} disabled={saving}>
                {saving ? t('agent.actions.saving', '保存中...') : t('agent.actions.saveSettings', '保存设置')}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                {t('agent.actions.cancel', '取消')}
              </Button>
              {saved && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <IconCheck className="h-4 w-4" />
                  {t('agent.messages.settingsSaved', '设置已保存')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">{t('agent.tabs.all', '全部')}</TabsTrigger>
              <TabsTrigger value="local">{t('agent.tabs.local', '本地')}</TabsTrigger>
              <TabsTrigger value="lingxi">{t('agent.tabs.lingxi', '灵犀')}</TabsTrigger>
            </TabsList>
            <Button onClick={handleCreateAgent}>
              <IconPlus className="mr-2 h-4 w-4" />
              {t('agent.actions.addAgent', '新增智能体')}
            </Button>
          </div>

          <TabsContent value="all">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
              {agents.map((agent) => (
                <Card key={agent.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{agent.description || t('agent.cards.noDescription', '无描述')}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('agent.cards.typeLabel', '类型:')}</span>
                        <span className="text-sm text-muted-foreground">
                          {agent.type === 'LINGXI' ? t('agent.types.lingxi', '灵犀') : t('agent.types.local', '本地')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('agent.cards.apiUrlLabel', 'API地址:')}</span>
                        <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                          {agent.apiUrl}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('agent.cards.createdAtLabel', '创建时间:')}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(agent.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0 flex gap-2">
                    <Button className="flex-1" onClick={() => handleEditAgent(agent)}>
                      <IconEdit className="mr-2 h-4 w-4" />
                      {t('agent.actions.edit', '编辑')}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <IconTrash className="mr-2 h-4 w-4" />
                      {t('agent.actions.delete', '删除')}
                    </Button>
                  </div>
                </Card>
              ))}

              {agents.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12">
                  <IconRobot className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('agent.empty.noAgents', '暂无智能体')}</h3>
                  <p className="text-muted-foreground mb-4">{t('agent.empty.createFirstAgent', '点击上方按钮创建您的第一个智能体')}</p>
                  <Button onClick={handleCreateAgent}>
                    <IconPlus className="mr-2 h-4 w-4" />
                    {t('agent.actions.createAgent', '创建智能体')}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="local">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
              {localAgents.map((agent) => (
                <Card key={agent.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <IconRobot className="h-5 w-5" />
                        <CardTitle>{agent.name}</CardTitle>
                      </div>
                    </div>
                    <CardDescription>{agent.description || t('agent.cards.noDescription', '无描述')}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('agent.cards.typeLabel', '类型:')}</span>
                        <span className="text-sm text-muted-foreground">{t('agent.types.local', '本地')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('agent.cards.apiUrlLabel', 'API地址:')}</span>
                        <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                          {agent.apiUrl}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('agent.cards.createdAtLabel', '创建时间:')}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(agent.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0 flex gap-2">
                    <Button className="flex-1" onClick={() => handleEditAgent(agent)}>
                      <IconEdit className="mr-2 h-4 w-4" />
                      {t('agent.actions.edit', '编辑')}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <IconTrash className="mr-2 h-4 w-4" />
                      {t('agent.actions.delete', '删除')}
                    </Button>
                  </div>
                </Card>
              ))}

              {localAgents.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12">
                  <IconRobot className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('agent.empty.noLocalAgents', '暂无本地智能体')}</h3>
                  <p className="text-muted-foreground mb-4">{t('agent.empty.createFirstLocalAgent', '点击上方按钮创建您的第一个本地智能体')}</p>
                  <Button
                    onClick={() => {
                      handleCreateAgent();
                      setFormData((prev) => ({ ...prev, type: 'LOCAL' }));
                    }}
                  >
                    <IconPlus className="mr-2 h-4 w-4" />
                    {t('agent.actions.createLocalAgent', '创建本地智能体')}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="lingxi">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
              {lingxiAgents.map((agent) => (
                <Card key={agent.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <IconRobot className="h-5 w-5" />
                        <CardTitle>{agent.name}</CardTitle>
                      </div>
                    </div>
                    <CardDescription>{agent.description || t('agent.cards.noDescription', '无描述')}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('agent.cards.typeLabel', '类型:')}</span>
                        <span className="text-sm text-muted-foreground">{t('agent.types.lingxi', '灵犀')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('agent.cards.apiUrlLabel', 'API地址:')}</span>
                        <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                          {agent.apiUrl}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('agent.cards.createdAtLabel', '创建时间:')}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(agent.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0 flex gap-2">
                    <Button className="flex-1" onClick={() => handleEditAgent(agent)}>
                      <IconEdit className="mr-2 h-4 w-4" />
                      {t('agent.actions.edit', '编辑')}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <IconTrash className="mr-2 h-4 w-4" />
                      {t('agent.actions.delete', '删除')}
                    </Button>
                  </div>
                </Card>
              ))}

              {lingxiAgents.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12">
                  <IconRobot className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('agent.empty.noLingxiAgents', '暂无灵犀智能体')}</h3>
                  <p className="text-muted-foreground mb-4">{t('agent.empty.createFirstLingxiAgent', '点击上方按钮创建您的第一个灵犀智能体')}</p>
                  <Button
                    onClick={() => {
                      handleCreateAgent();
                      setFormData((prev) => ({ ...prev, type: 'LINGXI' }));
                    }}
                  >
                    <IconPlus className="mr-2 h-4 w-4" />
                    {t('agent.actions.createLingxiAgent', '创建灵犀智能体')}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}