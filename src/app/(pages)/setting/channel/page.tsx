'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { FeishuConfigTab, type FeishuSettings } from './components/FeishuConfigTab';
import { WeixinConfigTab, type WeixinSettings } from './components/WeixinConfigTab';

const WEIXIN_KEYS = [
  'WEIXIN_TOKEN',
  'WEIXIN_ACCOUNT_ID',
  'WEIXIN_BASE_URL',
  'WEIXIN_ALLOWED_USERS',
] as const;
type WeixinKey = (typeof WEIXIN_KEYS)[number];

const DEFAULT_WEIXIN: WeixinSettings = {
  WEIXIN_TOKEN: '',
  WEIXIN_ACCOUNT_ID: '',
  WEIXIN_BASE_URL: '',
  WEIXIN_ALLOWED_USERS: '',
};

const DEFAULT_FEISHU: FeishuSettings = {
  enabled: false,
  appId: '',
  appSecret: '',
  domain: 'feishu',
  allowedUserOpenIds: '',
  allowedChatIds: '',
  secretConfigured: false,
  running: false,
  connectionState: 'disconnected',
};

export default function ChannelSettings() {
  const { t } = useTranslation('setting');
  const [weixin, setWeixin] = useState<WeixinSettings>(DEFAULT_WEIXIN);
  const [feishu, setFeishu] = useState<FeishuSettings>(DEFAULT_FEISHU);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'feishu' | 'weixin' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadFeishu = async () => {
    const response = await fetch('/api/channel/feishu');
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error);
    const config = result.data;
    setFeishu({
      enabled: config.enabled,
      appId: config.appId,
      appSecret: '',
      domain: config.domain,
      allowedUserOpenIds: config.allowedUserOpenIds.join(','),
      allowedChatIds: config.allowedChatIds.join(','),
      secretConfigured: config.secretConfigured,
      running: config.running,
      connectionState: config.connectionState,
    });
  };

  useEffect(() => {
    Promise.all([fetch('/api/setting'), fetch('/api/channel/feishu')])
      .then(async ([settingResponse, feishuResponse]) => {
        const settingResult = await settingResponse.json();
        const feishuResult = await feishuResponse.json();
        if (settingResult.success) {
          setWeixin((previous) => ({
            ...previous,
            ...Object.fromEntries(
              WEIXIN_KEYS.filter((key) => settingResult.data[key]).map((key) => [
                key,
                settingResult.data[key],
              ]),
            ),
          }));
        }
        if (feishuResult.success) {
          const config = feishuResult.data;
          setFeishu({
            enabled: config.enabled,
            appId: config.appId,
            appSecret: '',
            domain: config.domain,
            allowedUserOpenIds: config.allowedUserOpenIds.join(','),
            allowedChatIds: config.allowedChatIds.join(','),
            secretConfigured: config.secretConfigured,
            running: config.running,
            connectionState: config.connectionState,
          });
        }
      })
      .catch(() => {
        setMessage({ type: 'error', text: t('channel.messages.loadFailed', '加载配置失败') });
      })
      .finally(() => setLoading(false));
  }, [t]);

  const showResult = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const saveWeixin = async () => {
    setSaving('weixin');
    try {
      await Promise.all(
        WEIXIN_KEYS.filter((key) => weixin[key]).map((key) =>
          fetch('/api/setting', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value: weixin[key] }),
          }),
        ),
      );
      showResult('success', t('channel.messages.saved', '渠道配置已保存'));
    } catch {
      showResult('error', t('channel.messages.saveFailed', '保存失败'));
    } finally {
      setSaving(null);
    }
  };

  const saveFeishu = async () => {
    setSaving('feishu');
    try {
      const response = await fetch('/api/channel/feishu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: feishu.enabled,
          appId: feishu.appId,
          appSecret: feishu.appSecret || undefined,
          domain: feishu.domain,
          allowedUserOpenIds: feishu.allowedUserOpenIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
          allowedChatIds: feishu.allowedChatIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setFeishu((previous) => ({
        ...previous,
        appSecret: '',
        secretConfigured: result.data.secretConfigured,
        running: result.data.running,
        connectionState: result.data.connectionState,
      }));
      showResult('success', t('channel.messages.saved', '渠道配置已保存'));
    } catch (error) {
      showResult(
        'error',
        error instanceof Error && error.message
          ? error.message
          : t('channel.messages.saveFailed', '保存失败'),
      );
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t('channel.title', '渠道设置')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('channel.description', '配置 Agent 消息渠道（飞书、微信等）')}
        </p>
      </div>

      {message && (
        <div
          className={
            message.type === 'success'
              ? 'rounded bg-green-100 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'rounded bg-red-100 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }
        >
          {message.text}
        </div>
      )}

      <Tabs defaultValue="weixin" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="weixin">{t('channel.weixin.title', '微信个人号')}</TabsTrigger>
          <TabsTrigger value="feishu">{t('channel.feishu.title', '飞书机器人')}</TabsTrigger>
        </TabsList>

        <TabsContent value="weixin">
          <WeixinConfigTab
            settings={weixin}
            saving={saving === 'weixin'}
            onSettingChange={(key: WeixinKey, value) =>
              setWeixin((previous) => ({ ...previous, [key]: value }))
            }
            onSave={saveWeixin}
          />
        </TabsContent>
        <TabsContent value="feishu">
          <FeishuConfigTab
            settings={feishu}
            saving={saving === 'feishu'}
            onSettingChange={(key, value) =>
              setFeishu((previous) => ({ ...previous, [key]: value }))
            }
            onSave={saveFeishu}
            onRegistrationSuccess={loadFeishu}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
