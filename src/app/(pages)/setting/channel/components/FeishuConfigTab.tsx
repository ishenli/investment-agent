'use client';

import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Switch } from '@renderer/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { FeishuAppRegistration } from './FeishuAppRegistration';

export interface FeishuSettings {
  enabled: boolean;
  appId: string;
  appSecret: string;
  domain: 'feishu' | 'lark';
  allowedUserOpenIds: string;
  allowedChatIds: string;
  secretConfigured: boolean;
  running: boolean;
  connectionState: string;
}

export interface FeishuConfigTabProps {
  settings: FeishuSettings;
  saving: boolean;
  onSettingChange: <K extends keyof FeishuSettings>(key: K, value: FeishuSettings[K]) => void;
  onSave: () => void;
  onRegistrationSuccess: () => void | Promise<void>;
}

export function FeishuConfigTab({
  settings,
  saving,
  onSettingChange,
  onSave,
  onRegistrationSuccess,
}: FeishuConfigTabProps) {
  const { t } = useTranslation('setting');
  const configured = Boolean(settings.appId && settings.secretConfigured);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{t('channel.feishu.title', '飞书机器人')}</CardTitle>
            <CardDescription className="mt-1">
              {t('channel.feishu.description', '通过飞书长连接接收消息并调用 AI Agent')}
            </CardDescription>
          </div>
          <Badge variant={settings.running ? 'default' : 'secondary'}>
            {settings.running
              ? t('channel.status.connected', '已连接')
              : configured
                ? t('channel.status.configured', '已配置')
                : t('channel.status.notConfigured', '未配置')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <FeishuAppRegistration onSuccess={onRegistrationSuccess} />

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="FEISHU_ENABLED">{t('channel.feishu.enabled', '启用飞书渠道')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('channel.feishu.modeHint', '使用官方 SDK WebSocket 长连接')}
            </p>
          </div>
          <Switch
            id="FEISHU_ENABLED"
            checked={settings.enabled}
            onCheckedChange={(checked) => onSettingChange('enabled', checked)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="FEISHU_APP_ID">App ID</Label>
            <Input
              id="FEISHU_APP_ID"
              value={settings.appId}
              onChange={(event) => onSettingChange('appId', event.target.value)}
              placeholder="cli_xxxxxxxxxx"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="FEISHU_APP_SECRET">App Secret</Label>
            <Input
              id="FEISHU_APP_SECRET"
              type="password"
              value={settings.appSecret}
              onChange={(event) => onSettingChange('appSecret', event.target.value)}
              placeholder={
                settings.secretConfigured
                  ? t('channel.feishu.secretConfigured', '已安全配置，留空保持不变')
                  : t('channel.feishu.appSecretPlaceholder', '飞书应用 App Secret')
              }
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="FEISHU_ALLOWED_USERS">
              {t('channel.feishu.allowedUsers', '允许私聊的 open_id')}
            </Label>
            <Input
              id="FEISHU_ALLOWED_USERS"
              value={settings.allowedUserOpenIds}
              onChange={(event) => onSettingChange('allowedUserOpenIds', event.target.value)}
              placeholder="ou_xxx,ou_yyy"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="FEISHU_ALLOWED_CHATS">
              {t('channel.feishu.allowedChats', '允许群聊的 chat_id')}
            </Label>
            <Input
              id="FEISHU_ALLOWED_CHATS"
              value={settings.allowedChatIds}
              onChange={(event) => onSettingChange('allowedChatIds', event.target.value)}
              placeholder="oc_xxx,oc_yyy"
            />
          </div>
        </div>

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
