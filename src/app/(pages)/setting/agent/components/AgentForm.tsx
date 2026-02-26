import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Textarea } from '@renderer/components/ui/textarea';
import { Label } from '@renderer/components/ui/label';
import { Input } from '@renderer/components/ui/input';
import {
  IconRobot,
  IconCheck,
  IconX,
  IconCirclePlus,
  IconCircleMinus,
  IconStar,
} from '@tabler/icons-react';
import { AgentTypeResponse as Agent } from '@typings/agent';
import { useTranslation } from 'react-i18next';

interface AgentFormProps {
  editingAgent: Agent | null;
  isCreating: boolean;
  formData: Partial<Agent>;
  saving: boolean;
  saved: boolean;
  onCancel: () => void;
  onSave: () => void;
  onChange: (field: keyof Agent, value: any) => void;
  onAddOpeningQuestion: () => void;
  onRemoveOpeningQuestion: (index: number) => void;
  onOpeningQuestionChange: (index: number, value: string) => void;
}

export function AgentForm({
  editingAgent,
  isCreating,
  formData,
  saving,
  saved,
  onCancel,
  onSave,
  onChange,
  onAddOpeningQuestion,
  onRemoveOpeningQuestion,
  onOpeningQuestionChange,
}: AgentFormProps) {
  const { t } = useTranslation('setting');
  const isEditingBuiltin = editingAgent?.isBuiltin === true;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconRobot className="h-5 w-5" />
              {isCreating ? t('agent.form.title.create', '创建智能体') : (
                <>
                  {t('agent.form.title.edit', '编辑 %s').replace('%s', editingAgent?.name || '')}
                  {isEditingBuiltin && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                      <IconStar className="h-3 w-3" />
                      {t('agent.builtin', '内置')}
                    </span>
                  )}
                </>
              )}
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <IconX className="h-4 w-4" />
          </Button>
        </div>
        {isEditingBuiltin && (
          <p className="text-sm text-muted-foreground mt-2">
            {t('agent.form.builtinHint', '内置智能体只能编辑描述、系统提示词、Logo 和开场问题。')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-name">{t('agent.form.fields.name.label', '名称 *')}</Label>
          <Input
            id="agent-name"
            value={formData.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder={t('agent.form.fields.name.placeholder', '输入智能体名称')}
            disabled={isEditingBuiltin}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-slug">{t('agent.form.fields.slug.label', 'Slug *')}</Label>
          <Input
            id="agent-slug"
            value={formData.slug || ''}
            onChange={(e) => onChange('slug', e.target.value)}
            placeholder={t('agent.form.fields.slug.placeholder', '输入智能体 Slug')}
            disabled={isEditingBuiltin || !!editingAgent}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-type">{t('agent.form.fields.type.label', '类型 *')}</Label>
          <select
            id="agent-type"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.type || 'LOCAL'}
            onChange={(e) => onChange('type', e.target.value as 'LOCAL' | 'LINGXI')}
            disabled={isEditingBuiltin}
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
            onChange={(e) => onChange('description', e.target.value)}
            placeholder={t('agent.form.fields.description.placeholder', '输入智能体描述')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-logo">{t('agent.form.fields.logo.label', 'Logo URL')}</Label>
          <Input
            id="agent-logo"
            value={formData.logo || ''}
            onChange={(e) => onChange('logo', e.target.value)}
            placeholder={t('agent.form.fields.logo.placeholder', '输入Logo URL')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-systemRole">{t('agent.form.fields.systemRole.label', '系统提示词')}</Label>
          <Textarea
            id="agent-systemRole"
            value={formData.systemRole || ''}
            onChange={(e) => onChange('systemRole', e.target.value)}
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
              onClick={onAddOpeningQuestion}
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
                  onChange={(e) => onOpeningQuestionChange(index, e.target.value)}
                  placeholder={t('agent.form.fields.openingQuestions.placeholder', '开场问题 %d').replace('%d', (index + 1).toString())}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveOpeningQuestion(index)}
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
          <Button onClick={onSave} disabled={saving}>
            {saving ? t('agent.actions.saving', '保存中...') : t('agent.actions.saveSettings', '保存设置')}
          </Button>
          <Button variant="outline" onClick={onCancel}>
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
  );
}
