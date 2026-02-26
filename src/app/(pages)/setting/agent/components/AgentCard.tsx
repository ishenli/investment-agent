import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { IconRobot, IconEdit, IconTrash, IconStar } from '@tabler/icons-react';
import { AgentTypeResponse as Agent } from '@typings/agent';
import { useTranslation } from 'react-i18next';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const { t } = useTranslation('setting');

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <IconRobot className="h-5 w-5" />
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            {agent.isBuiltin && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                <IconStar className="h-3 w-3" />
                {t('agent.builtin', '内置')}
              </span>
            )}
          </div>
        </div>
        <CardDescription>{agent.description || t('agent.cards.noDescription', '无描述')}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('agent.cards.typeLabel', '类型:')}</span>
            <span className="text-sm text-muted-foreground">
              {agent.type === 'LINGXI' ? t('agent.types.lingxi', '灵犀') : t('agent.types.local', '本地')}
            </span>
          </div>
          {!agent.isBuiltin && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('agent.cards.createdAtLabel', '创建时间:')}</span>
              <span className="text-sm text-muted-foreground">
                {new Date(agent.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <div className="p-4 pt-0 flex gap-2">
        <Button className="flex-1" onClick={() => onEdit(agent)}>
          <IconEdit className="mr-2 h-4 w-4" />
          {t('agent.actions.edit', '编辑')}
        </Button>
        {!agent.isBuiltin && (
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => onDelete(agent)}
          >
            <IconTrash className="mr-2 h-4 w-4" />
            {t('agent.actions.delete', '删除')}
          </Button>
        )}
      </div>
    </Card>
  );
}
