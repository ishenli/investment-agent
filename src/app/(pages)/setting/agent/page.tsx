'use client';

import { Button } from '@renderer/components/ui/button';
import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { get, post, put, del } from '@/app/lib/request/index';
import { toast } from 'sonner';
import { AgentTypeResponse as Agent } from '@typings/agent';
import { useTranslation } from 'react-i18next';
import { AgentForm } from './components/AgentForm';
import { AgentList } from './components/AgentList';

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
    logo: '',
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
      logo: '',
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
      openingQuestions: agent.openingQuestions,
      isBuiltin: agent.isBuiltin,
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
      logo: '',
      openingQuestions: [],
    });
  };

  const handleDeleteAgent = async (agent: Agent) => {
    // 内置 Agent 不允许删除
    if (agent.isBuiltin) {
      toast.error(t('agent.errors.cannotDeleteBuiltin', '内置智能体不能删除'));
      return;
    }

    if (!confirm(t('agent.confirmDelete', '确定要删除这个智能体吗？'))) {
      return;
    }

    try {
      const response: { success: boolean; message?: string } = await del(
        `/api/agent?agentId=${agent.id}`,
      );
      if (response.success) {
        toast.success(t('agent.messages.deleteSuccess', '智能体删除成功'));
      } else {
        throw new Error(response.message || '删除失败');
      }
      fetchAgents(); // 重新加载列表
    } catch (err) {
      console.error('Failed to delete agent', err);
      toast.error(t('agent.messages.deleteFailed', '删除智能体失败'));
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
  const builtinAgents = agents.filter((agent) => agent.isBuiltin);
  const customAgents = agents.filter((agent) => !agent.isBuiltin);

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
        <AgentForm
          editingAgent={editingAgent}
          isCreating={isCreating}
          formData={formData}
          saving={saving}
          saved={saved}
          onCancel={handleCancelEdit}
          onSave={handleSaveAgent}
          onChange={handleChange}
          onAddOpeningQuestion={handleAddOpeningQuestion}
          onRemoveOpeningQuestion={handleRemoveOpeningQuestion}
          onOpeningQuestionChange={handleOpeningQuestionChange}
        />
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">{t('agent.tabs.all', '全部')}</TabsTrigger>
              <TabsTrigger value="builtin">{t('agent.tabs.builtin', '内置')}</TabsTrigger>
              <TabsTrigger value="custom">{t('agent.tabs.custom', '自定义')}</TabsTrigger>
            </TabsList>
            <Button onClick={handleCreateAgent}>
              <IconPlus className="mr-2 h-4 w-4" />
              {t('agent.actions.addAgent', '新增智能体')}
            </Button>
          </div>

          <TabsContent value="all">
            <AgentList
              agents={agents}
              type="all"
              onEditAgent={handleEditAgent}
              onDeleteAgent={handleDeleteAgent}
              onCreateAgent={handleCreateAgent}
            />
          </TabsContent>

          <TabsContent value="builtin">
            <AgentList
              agents={builtinAgents}
              type="builtin"
              onEditAgent={handleEditAgent}
              onDeleteAgent={handleDeleteAgent}
              onCreateAgent={handleCreateAgent}
            />
          </TabsContent>

          <TabsContent value="custom">
            <AgentList
              agents={customAgents}
              type="custom"
              onEditAgent={handleEditAgent}
              onDeleteAgent={handleDeleteAgent}
              onCreateAgent={handleCreateAgent}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}