'use client';

import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { useState, useEffect } from 'react';
import { Eye, EyeOff, Key as KeyIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { useTranslation } from 'react-i18next';

// 定义允许的设置键
const ALLOWED_KEYS = [
  'FINNHUB_API_KEY',
  'LANGSMITH_API_KEY',
  'FINANCIAL_DATASETS_KEY',
  'TAVILY_API_KEY',
] as const;

// 定义需要隐藏的敏感键
const SENSITIVE_KEYS = [
  'FINNHUB_API_KEY',
  'LANGSMITH_API_KEY',
  'FINANCIAL_DATASETS_KEY',
  'TAVILY_API_KEY',
  'MODEL_PROVIDER_API_KEY',
] as const;

type SettingKey = (typeof ALLOWED_KEYS)[number];

type ToolSettingsProps = object

export default function ToolSettings({
  // Add props if needed
}: ToolSettingsProps) {
  const { t } = useTranslation('setting');
  const [settings, setSettings] = useState<Record<SettingKey, string>>({
    FINNHUB_API_KEY: '',
    LANGSMITH_API_KEY: '',
    FINANCIAL_DATASETS_KEY: '',
    TAVILY_API_KEY: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>(ALLOWED_KEYS[0]);

  // 获取所有设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/setting');
        const result = await response.json();

        if (result.success) {
          // 更新状态，保留未设置的键为空字符串
          setSettings((prev) => ({
            ...prev,
            ...result.data,
          }));
        } else {
          setMessage({ type: 'error', text: t('tool.messages.getSettingsFailed', '获取设置失败') });
        }
      } catch (error) {
        setMessage({ type: 'error', text: t('tool.messages.networkError', '网络错误') });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // 切换密钥可见性
  const toggleVisibility = (key: SettingKey) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 判断是否为敏感字段
  const isSensitiveKey = (key: SettingKey): boolean => {
    return SENSITIVE_KEYS.includes(key as (typeof SENSITIVE_KEYS)[number]);
  };

  // 更新单个设置
  const updateSetting = async (key: SettingKey, value: string) => {
    try {
      setSaving(true);
      const response = await fetch('/api/setting', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
      });

      const result = await response.json();

      if (result.success) {
        setSettings((prev) => ({
          ...prev,
          [key]: value,
        }));
        setMessage({ type: 'success', text: t('tool.messages.settingsSaved', '设置已保存') });
      } else {
        setMessage({ type: 'error', text: t('tool.messages.saveSettingsFailed', '保存设置失败') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('tool.messages.networkError', '网络错误') });
    } finally {
      setSaving(false);
      // 3秒后清除消息
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 删除设置
  const deleteSetting = async (key: SettingKey) => {
    try {
      const response = await fetch(`/api/setting?key=${key}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setSettings((prev) => ({
          ...prev,
          [key]: '',
        }));
        setMessage({ type: 'success', text: t('tool.messages.settingsDeleted', '设置已删除') });
      } else {
        setMessage({ type: 'error', text: t('tool.messages.deleteSettingsFailed', '删除设置失败') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('tool.messages.networkError', '网络错误') });
    } finally {
      // 3秒后清除消息
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 获取设置项的描述
  const getSettingDescription = (key: SettingKey): string => {
    const descriptions: Record<SettingKey, string> = {
      FINNHUB_API_KEY: t('tool.descriptions.FINNHUB_API_KEY', 'Finnhub API密钥'),
      LANGSMITH_API_KEY: t('tool.descriptions.LANGSMITH_API_KEY', 'LangSmith API密钥'),
      FINANCIAL_DATASETS_KEY: t('tool.descriptions.FINANCIAL_DATASETS_KEY', 'Financial Datasets密钥'),
      TAVILY_API_KEY: t('tool.descriptions.TAVILY_API_KEY', 'Tavily API密钥'),
    };

    return descriptions[key] || key;
  };

  // 获取设置项的详细说明
  const getSettingDetail = (key: SettingKey): string => {
    const details: Record<SettingKey, string> = {
      FINNHUB_API_KEY: t('tool.details.FINNHUB_API_KEY', '用于获取实时股票市场数据和分析报告'),
      LANGSMITH_API_KEY: t('tool.details.LANGSMITH_API_KEY', 'LangSmith 提供的 API 密钥，用于追踪和管理模型调用'),
      FINANCIAL_DATASETS_KEY: t('tool.details.FINANCIAL_DATASETS_KEY', '访问金融数据集的身份验证密钥'),
      TAVILY_API_KEY: t('tool.details.TAVILY_API_KEY', 'Tavily 搜索引擎的 API 密钥，用于高级搜索功能'),
    };

    return details[key] || '';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-lg text-muted-foreground">{t('tool.loading', '加载中...')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('tool.title', 'API KEY 配置')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('tool.description', '管理您的外部服务 API 密钥')}
          </p>
        </div>
      </div>

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          {ALLOWED_KEYS.map((key) => (
            <TabsTrigger key={key} value={key} className="text-sm">
              {t(`tool.tabs.${key.toLowerCase().replace('_api_key', '').replace('_key', '')}`, key.replace('_API_KEY', '').replace('_KEY', ''))}
            </TabsTrigger>
          ))}
        </TabsList>

        {ALLOWED_KEYS.map((key) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyIcon className="h-5 w-5" />
                  {t(`tool.descriptions.${key}`, getSettingDescription(key))}
                </CardTitle>
                <CardDescription>{t(`tool.details.${key}`, getSettingDetail(key))}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={key}>
                    {key} <span className="text-muted-foreground text-xs ml-2">({t('tool.fields.envVarName', '环境变量名')})</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id={key}
                      type={visibleKeys[key] ? 'text' : 'password'}
                      value={settings[key] || ''}
                      onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={t('tool.fields.inputPlaceholder', '请输入 %s 的值').replace('%s', key)}
                      className="pr-10"
                    />
                    {isSensitiveKey(key) && (
                      <button
                        type="button"
                        onClick={() => toggleVisibility(key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        {visibleKeys[key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => updateSetting(key, settings[key] || '')}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? t('tool.actions.saving', '保存中...') : t('tool.actions.save', '保存')}
                  </Button>
                  <Button
                    onClick={() => deleteSetting(key)}
                    variant="outline"
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    {t('tool.actions.delete', '删除')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}