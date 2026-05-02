'use client';

import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type FeishuKey = 'FEISHU_APP_ID' | 'FEISHU_APP_SECRET' | 'FEISHU_VERIFICATION_TOKEN' | 'FEISHU_ENCRYPT_KEY';

export type FeishuSettings = Record<FeishuKey, string>;

export interface FeishuConfigTabProps {
  settings: FeishuSettings;
  saving: boolean;
  onSettingChange: (key: FeishuKey, value: string) => void;
  onSave: () => void;
}

export function FeishuConfigTab({ settings, saving, onSettingChange, onSave }: FeishuConfigTabProps) {
  const { t } = useTranslation('setting');
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const toggleVisibility = (key: FeishuKey) => {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.6 10.6c-.4-2.7.3-5.4 2-7.5.3-.3.7-.3.9 0l4.6 4.6c.3.3.1.8-.3.9-1.5.3-2.8 1-3.8 2.1-.3.3-.8.3-1 0L2.6 10.6zM10.6 21.4c-2.7.4-5.4-.3-7.5-2-.3-.3-.3-.7 0-.9l4.6-4.6c.3-.3.8-.1.9.3.3 1.5 1 2.8 2.1 3.8.3.3.3.8 0 1l-2.1 2.4zM21.4 13.4c.4 2.7-.3 5.4-2 7.5-.3.3-.7.3-.9 0l-4.6-4.6c-.3-.3-.1-.8.3-.9 1.5-.3 2.8-1 3.8-2.1.3-.3.8-.3 1 0l2.4 2.1zM13.4 2.6c2.7-.4 5.4.3 7.5 2 .3.3.3.7 0 .9l-4.6 4.6c-.3.3-.8.1-.9-.3-.3-1.5-1-2.8-2.1-3.8-.3-.3-.3-.8 0-1l2.1-2.4z" />
            </svg>
            {t('channel.feishu.title', '飞书机器人')}
          </CardTitle>
          <Badge variant={settings.FEISHU_APP_ID ? 'default' : 'secondary'}>
            {settings.FEISHU_APP_ID
              ? t('channel.status.configured', '已配置')
              : t('channel.status.notConfigured', '未配置')}
          </Badge>
        </div>
        <CardDescription>
          {t(
            'channel.feishu.description',
            '配置飞书开放平台机器人，接收消息并通过 AI Agent 自动回复',
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* App Credentials */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('channel.feishu.credentials', '应用凭证')}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="FEISHU_APP_ID">App ID</Label>
              <Input
                id="FEISHU_APP_ID"
                value={settings.FEISHU_APP_ID}
                onChange={(e) => onSettingChange('FEISHU_APP_ID', e.target.value)}
                placeholder={t('channel.feishu.appIdPlaceholder', '飞书应用 App ID')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="FEISHU_APP_SECRET">App Secret</Label>
              <div className="relative">
                <Input
                  id="FEISHU_APP_SECRET"
                  type={visibleKeys.FEISHU_APP_SECRET ? 'text' : 'password'}
                  value={settings.FEISHU_APP_SECRET}
                  onChange={(e) => onSettingChange('FEISHU_APP_SECRET', e.target.value)}
                  placeholder={t('channel.feishu.appSecretPlaceholder', '飞书应用 App Secret')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('FEISHU_APP_SECRET')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {visibleKeys.FEISHU_APP_SECRET ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Event Subscription */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('channel.feishu.eventConfig', '事件订阅配置')}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="FEISHU_VERIFICATION_TOKEN">Verification Token</Label>
              <Input
                id="FEISHU_VERIFICATION_TOKEN"
                value={settings.FEISHU_VERIFICATION_TOKEN}
                onChange={(e) => onSettingChange('FEISHU_VERIFICATION_TOKEN', e.target.value)}
                placeholder={t('channel.feishu.verificationTokenPlaceholder', '事件订阅验证 Token')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="FEISHU_ENCRYPT_KEY">Encrypt Key</Label>
              <div className="relative">
                <Input
                  id="FEISHU_ENCRYPT_KEY"
                  type={visibleKeys.FEISHU_ENCRYPT_KEY ? 'text' : 'password'}
                  value={settings.FEISHU_ENCRYPT_KEY}
                  onChange={(e) => onSettingChange('FEISHU_ENCRYPT_KEY', e.target.value)}
                  placeholder={t('channel.feishu.encryptKeyPlaceholder', '事件加密 Key（可选）')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('FEISHU_ENCRYPT_KEY')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {visibleKeys.FEISHU_ENCRYPT_KEY ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <p>
              <strong>Webhook URL:</strong>{' '}
              <code className="rounded bg-background px-1 py-0.5">
                {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain'}
                /api/channel/feishu
              </code>
            </p>
            <p className="mt-1">
              {t(
                'channel.feishu.webhookHint',
                '将此 URL 填入飞书开放平台「事件订阅」的请求地址中，并订阅 im.message.receive_v1 事件。',
              )}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saving} className="min-w-32">
            {saving
              ? t('channel.actions.saving', '保存中...')
              : t('channel.actions.save', '保存配置')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
