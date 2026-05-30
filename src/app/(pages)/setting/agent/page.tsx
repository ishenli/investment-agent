'use client';

import { useTranslation } from 'react-i18next';
import { AgentRuntimeAssetsView } from './components/AgentRuntimeAssetsView';

export default function AgentSettingsPage() {
  const { t } = useTranslation('setting');

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t('agent.title', '智能体设置')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('agent.description', '管理 Agent 运行时资源文件')}
        </p>
      </div>

      <AgentRuntimeAssetsView />
    </div>
  );
}
