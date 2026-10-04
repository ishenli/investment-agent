'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { IconMessageCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Label } from '@renderer/components/ui/label';
import { Switch } from '@renderer/components/ui/switch';

export const CHAT_AI_TIPS_SETTING_KEY = 'CHAT_AI_TIPS_ENABLED';

export default function ConversationSettings() {
  const { t } = useTranslation('setting');
  const [enabled, setEnabled] = React.useState(true); // 未配置默认开启
  const [loading, setLoading] = React.useState(true);
  const [saved, setSaved] = React.useState(false);

  // 读取当前账户设置：未配置 → 开启
  React.useEffect(() => {
    fetch('/api/setting')
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          const value = result.data?.[CHAT_AI_TIPS_SETTING_KEY];
          setEnabled(value !== 'false');
        }
      })
      .catch(() => setEnabled(true))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    try {
      const response = await fetch('/api/setting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: CHAT_AI_TIPS_SETTING_KEY, value: String(checked) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setEnabled(!checked); // 写入失败回滚
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setEnabled(!checked); // 写入失败回滚
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('conversation.title', '对话设置')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('conversation.description', '对话行为相关配置')}
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            {t('actions.save', '已保存')}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconMessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('conversation.aiTips.title', 'AI 追问提示')}</CardTitle>
              <CardDescription>
                {t(
                  'conversation.aiTips.description',
                  '开启后在 AI 回复下方展示相关追问建议（每次不超过 3 条）',
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={CHAT_AI_TIPS_SETTING_KEY}>
                {t('conversation.aiTips.enabled', '显示 AI 追问提示')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t(
                  'conversation.aiTips.enabledDescription',
                  '关闭后不再为新的 AI 回复生成追问建议',
                )}
              </p>
            </div>
            <Switch
              id={CHAT_AI_TIPS_SETTING_KEY}
              checked={enabled}
              disabled={loading}
              onCheckedChange={handleToggle}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}