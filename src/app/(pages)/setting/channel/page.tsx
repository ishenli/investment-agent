'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { FeishuConfigTab, type FeishuSettings } from './components/FeishuConfigTab';
import { WeixinConfigTab, type WeixinSettings } from './components/WeixinConfigTab';

// All channel setting keys stored in the settings table
const CHANNEL_KEYS = [
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET',
  'FEISHU_VERIFICATION_TOKEN',
  'FEISHU_ENCRYPT_KEY',
  'WEIXIN_TOKEN',
  'WEIXIN_ACCOUNT_ID',
  'WEIXIN_BASE_URL',
  'WEIXIN_ALLOWED_USERS',
] as const;

type ChannelKey = (typeof CHANNEL_KEYS)[number];

const FEISHU_KEYS = [
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET',
  'FEISHU_VERIFICATION_TOKEN',
  'FEISHU_ENCRYPT_KEY',
] as const;

const WEIXIN_KEYS = [
  'WEIXIN_TOKEN',
  'WEIXIN_ACCOUNT_ID',
  'WEIXIN_BASE_URL',
  'WEIXIN_ALLOWED_USERS',
] as const;

const DEFAULT_SETTINGS: Record<ChannelKey, string> = {
  FEISHU_APP_ID: '',
  FEISHU_APP_SECRET: '',
  FEISHU_VERIFICATION_TOKEN: '',
  FEISHU_ENCRYPT_KEY: '',
  WEIXIN_TOKEN: '',
  WEIXIN_ACCOUNT_ID: '',
  WEIXIN_BASE_URL: '',
  WEIXIN_ALLOWED_USERS: '',
};

export default function ChannelSettings() {
  const { t } = useTranslation('setting');
  const [settings, setSettings] = useState<Record<ChannelKey, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'feishu' | 'weixin' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/setting');
        const result = await response.json();
        if (result.success) {
          setSettings((prev) => ({
            ...prev,
            ...Object.fromEntries(
              CHANNEL_KEYS.filter((key) => result.data[key]).map((key) => [key, result.data[key]]),
            ),
          }));
        }
      } catch {
        setMessage({ type: 'error', text: t('channel.messages.loadFailed', '加载配置失败') });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [t]);

  const handleSettingChange = (key: ChannelKey, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async (keys: readonly ChannelKey[], platform: 'feishu' | 'weixin') => {
    setSaving(platform);
    try {
      for (const key of keys) {
        if (settings[key]) {
          await fetch('/api/setting', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value: settings[key] }),
          });
        }
      }
      setMessage({ type: 'success', text: t('channel.messages.saved', '渠道配置已保存') });
    } catch {
      setMessage({ type: 'error', text: t('channel.messages.saveFailed', '保存失败') });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <div className="text-lg text-muted-foreground">{t('channel.loading', '加载中...')}</div>
      </div>
    );
  }

  const feishuSettings: FeishuSettings = {
    FEISHU_APP_ID: settings.FEISHU_APP_ID,
    FEISHU_APP_SECRET: settings.FEISHU_APP_SECRET,
    FEISHU_VERIFICATION_TOKEN: settings.FEISHU_VERIFICATION_TOKEN,
    FEISHU_ENCRYPT_KEY: settings.FEISHU_ENCRYPT_KEY,
  };

  const weixinSettings: WeixinSettings = {
    WEIXIN_TOKEN: settings.WEIXIN_TOKEN,
    WEIXIN_ACCOUNT_ID: settings.WEIXIN_ACCOUNT_ID,
    WEIXIN_BASE_URL: settings.WEIXIN_BASE_URL,
    WEIXIN_ALLOWED_USERS: settings.WEIXIN_ALLOWED_USERS,
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">{t('channel.title', '渠道设置')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('channel.description', '配置 Agent 消息渠道（飞书、微信等）')}
        </p>
      </div>

      {/* Global message banner */}
      {message && (
        <div
          className={`p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Channel tabs */}
      <Tabs defaultValue="feishu" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="feishu" className="flex items-center gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.6 10.6c-.4-2.7.3-5.4 2-7.5.3-.3.7-.3.9 0l4.6 4.6c.3.3.1.8-.3.9-1.5.3-2.8 1-3.8 2.1-.3.3-.8.3-1 0L2.6 10.6zM10.6 21.4c-2.7.4-5.4-.3-7.5-2-.3-.3-.3-.7 0-.9l4.6-4.6c.3-.3.8-.1.9.3.3 1.5 1 2.8 2.1 3.8.3.3.3.8 0 1l-2.1 2.4zM21.4 13.4c.4 2.7-.3 5.4-2 7.5-.3.3-.7.3-.9 0l-4.6-4.6c-.3-.3-.1-.8.3-.9 1.5-.3 2.8-1 3.8-2.1.3-.3.8-.3 1 0l2.4 2.1zM13.4 2.6c2.7-.4 5.4.3 7.5 2 .3.3.3.7 0 .9l-4.6 4.6c-.3.3-.8.1-.9-.3-.3-1.5-1-2.8-2.1-3.8-.3-.3-.3-.8 0-1l2.1-2.4z" />
            </svg>
            {t('channel.feishu.title', '飞书机器人')}
          </TabsTrigger>

          <TabsTrigger value="weixin" className="flex items-center gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-3.898-6.348-7.596-6.348zM5.785 7.44a.96.96 0 1 1 0-1.92.96.96 0 0 1 0 1.92zm5.813 0a.96.96 0 1 1 0-1.92.96.96 0 0 1 0 1.92zm2.259 4.72c-3.276 0-5.932 2.28-5.932 5.09 0 2.808 2.656 5.09 5.932 5.09.67 0 1.316-.1 1.916-.28a.59.59 0 0 1 .49.067l1.313.768a.23.23 0 0 0 .115.038.203.203 0 0 0 .2-.203c0-.05-.02-.1-.033-.148l-.27-1.022a.41.41 0 0 1 .147-.458C18.914 19.81 20 18.177 20 16.344c0-2.81-2.656-5.09-5.932-5.09h-.211zm-2.248 3.367a.665.665 0 1 1 0-1.33.665.665 0 0 1 0 1.33zm4.497 0a.665.665 0 1 1 0-1.33.665.665 0 0 1 0 1.33z" />
            </svg>
            {t('channel.weixin.title', '微信个人号')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feishu">
          <FeishuConfigTab
            settings={feishuSettings}
            saving={saving === 'feishu'}
            onSettingChange={(key, value) => handleSettingChange(key, value)}
            onSave={() => saveSettings(FEISHU_KEYS, 'feishu')}
          />
        </TabsContent>

        <TabsContent value="weixin">
          <WeixinConfigTab
            settings={weixinSettings}
            saving={saving === 'weixin'}
            onSettingChange={(key, value) => handleSettingChange(key, value)}
            onSave={() => saveSettings(WEIXIN_KEYS, 'weixin')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
