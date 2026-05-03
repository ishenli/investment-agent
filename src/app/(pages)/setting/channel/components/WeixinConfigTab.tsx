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
import { WeixinQrLogin } from './WeixinQrLogin';

type WeixinKey = 'WEIXIN_TOKEN' | 'WEIXIN_ACCOUNT_ID' | 'WEIXIN_BASE_URL' | 'WEIXIN_ALLOWED_USERS';

export type WeixinSettings = Record<WeixinKey, string>;

export interface WeixinConfigTabProps {
  settings: WeixinSettings;
  saving: boolean;
  onSettingChange: (key: WeixinKey, value: string) => void;
  onSave: () => void;
}

export function WeixinConfigTab({ settings, saving, onSettingChange, onSave }: WeixinConfigTabProps) {
  const { t } = useTranslation('setting');
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const toggleVisibility = (key: WeixinKey) => {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleQrSuccess = ({ accountId, token }: { accountId: string; token: string }) => {
    onSettingChange('WEIXIN_ACCOUNT_ID', accountId);
    if (token) onSettingChange('WEIXIN_TOKEN', token);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle className="flex items-center gap-2">
            {/* WeChat logo */}
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-3.898-6.348-7.596-6.348zM5.785 7.44a.96.96 0 1 1 0-1.92.96.96 0 0 1 0 1.92zm5.813 0a.96.96 0 1 1 0-1.92.96.96 0 0 1 0 1.92zm2.259 4.72c-3.276 0-5.932 2.28-5.932 5.09 0 2.808 2.656 5.09 5.932 5.09.67 0 1.316-.1 1.916-.28a.59.59 0 0 1 .49.067l1.313.768a.23.23 0 0 0 .115.038.203.203 0 0 0 .2-.203c0-.05-.02-.1-.033-.148l-.27-1.022a.41.41 0 0 1 .147-.458C18.914 19.81 20 18.177 20 16.344c0-2.81-2.656-5.09-5.932-5.09h-.211zm-2.248 3.367a.665.665 0 1 1 0-1.33.665.665 0 0 1 0 1.33zm4.497 0a.665.665 0 1 1 0-1.33.665.665 0 0 1 0 1.33z" />
            </svg>
            {t('channel.weixin.title', '微信个人号')}
          </CardTitle>
          <Badge variant={settings.WEIXIN_TOKEN && settings.WEIXIN_ACCOUNT_ID ? 'default' : 'secondary'}>
            {settings.WEIXIN_TOKEN && settings.WEIXIN_ACCOUNT_ID
              ? t('channel.status.configured', '已配置')
              : t('channel.status.notConfigured', '未配置')}
          </Badge>
        </div>
        <CardDescription>
          {t(
            'channel.weixin.description',
            '通过腾讯 iLink Bot API 接入微信个人号，使用长轮询模式接收并自动回复消息',
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* QR Login */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('channel.weixin.qrLogin', '扫码登录（推荐）')}
          </h3>
          <WeixinQrLogin onSuccess={handleQrSuccess} />
        </div>

        {/* Bot Credentials — manual fallback */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('channel.weixin.credentialsManual', '手动填写凭证（备用）')}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="WEIXIN_ACCOUNT_ID">Account ID</Label>
              <Input
                id="WEIXIN_ACCOUNT_ID"
                value={settings.WEIXIN_ACCOUNT_ID}
                onChange={(e) => onSettingChange('WEIXIN_ACCOUNT_ID', e.target.value)}
                placeholder={t('channel.weixin.accountIdPlaceholder', 'iLink Bot Account ID')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="WEIXIN_TOKEN">Bot Token</Label>
              <div className="relative">
                <Input
                  id="WEIXIN_TOKEN"
                  type={visibleKeys.WEIXIN_TOKEN ? 'text' : 'password'}
                  value={settings.WEIXIN_TOKEN}
                  onChange={(e) => onSettingChange('WEIXIN_TOKEN', e.target.value)}
                  placeholder={t('channel.weixin.tokenPlaceholder', 'iLink Bot Token')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('WEIXIN_TOKEN')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {visibleKeys.WEIXIN_TOKEN ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Config */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('channel.weixin.advanced', '高级配置（可选）')}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="WEIXIN_BASE_URL">API Base URL</Label>
              <Input
                id="WEIXIN_BASE_URL"
                value={settings.WEIXIN_BASE_URL}
                onChange={(e) => onSettingChange('WEIXIN_BASE_URL', e.target.value)}
                placeholder="https://ilinkai.weixin.qq.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="WEIXIN_ALLOWED_USERS">
                {t('channel.weixin.allowedUsers', '白名单用户 ID')}
              </Label>
              <Input
                id="WEIXIN_ALLOWED_USERS"
                value={settings.WEIXIN_ALLOWED_USERS}
                onChange={(e) => onSettingChange('WEIXIN_ALLOWED_USERS', e.target.value)}
                placeholder={t(
                  'channel.weixin.allowedUsersPlaceholder',
                  '多个 ID 用逗号分隔，留空则对所有好友开放',
                )}
              />
            </div>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground space-y-1">
            <p>
              <strong>{t('channel.weixin.howToGetTitle', '如何获取凭证：')}</strong>
            </p>
            <p>
              {t(
                'channel.weixin.howToGetHint',
                '在腾讯 iLink 平台完成微信个人号扫码登录后，将生成的 Account ID 和 Bot Token 填入上方字段。',
              )}
            </p>
            <p>
              <strong>{t('channel.weixin.modeTitle', '接入模式')}:</strong>
              {t(
                'channel.weixin.modeHint',
                '微信渠道使用长轮询（Long Poll）模式，无需配置 Webhook 地址，服务启动后自动连接。',
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
