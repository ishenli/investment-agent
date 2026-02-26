import { Button } from '@renderer/components/ui/button';
import { IconRobot, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  type: 'all' | 'builtin' | 'custom';
  onCreateAgent: () => void;
}

export function EmptyState({ type, onCreateAgent }: EmptyStateProps) {
  const { t } = useTranslation('setting');

  const getEmptyMessage = () => {
    switch (type) {
      case 'builtin':
        return {
          title: t('agent.empty.noBuiltinAgents', '暂无内置智能体'),
          description: t('agent.empty.builtinHint', '内置智能体在系统启动时自动初始化'),
          showButton: false,
        };
      case 'custom':
        return {
          title: t('agent.empty.noCustomAgents', '暂无自定义智能体'),
          description: t('agent.empty.createFirstCustomAgent', '点击上方按钮创建您的第一个自定义智能体'),
          showButton: true,
        };
      default:
        return {
          title: t('agent.empty.noAgents', '暂无智能体'),
          description: t('agent.empty.createFirstAgent', '点击上方按钮创建您的第一个智能体'),
          showButton: true,
        };
    }
  };

  const { title, description, showButton } = getEmptyMessage();

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12">
      <IconRobot className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {showButton && (
        <Button onClick={onCreateAgent}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('agent.actions.createAgent', '创建智能体')}
        </Button>
      )}
    </div>
  );
}
