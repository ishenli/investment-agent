'use client';

import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { useState, useEffect } from 'react';


// 定义允许的设置键
const ALLOWED_KEYS = [
  'MODEL_PROVIDER_URL',
  'AGENT_PROVIDER_URL',
  'MODEL_PROVIDER_API_KEY',
  'FINNHUB_API_KEY',
  'LANGSMITH_API_KEY',
  'FINANCIAL_DATASETS_KEY',
  'TAVILY_API_KEY'
] as const;

type SettingKey = typeof ALLOWED_KEYS[number];

export default function SettingPage() {
  const [settings, setSettings] = useState<Record<SettingKey, string>>({
    MODEL_PROVIDER_URL: '',
    AGENT_PROVIDER_URL: '',
    MODEL_PROVIDER_API_KEY: '',
    FINNHUB_API_KEY: '',
    LANGSMITH_API_KEY: '',
    FINANCIAL_DATASETS_KEY: '',
    TAVILY_API_KEY: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 获取所有设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/setting');
        const result = await response.json();

        if (result.success) {
          // 更新状态，保留未设置的键为空字符串
          setSettings(prev => ({
            ...prev,
            ...result.data
          }));
        } else {
          setMessage({ type: 'error', text: '获取设置失败' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: '网络错误' });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

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
        setSettings(prev => ({
          ...prev,
          [key]: value
        }));
        setMessage({ type: 'success', text: '设置已保存' });
      } else {
        setMessage({ type: 'error', text: '保存设置失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误' });
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
        setSettings(prev => ({
          ...prev,
          [key]: ''
        }));
        setMessage({ type: 'success', text: '设置已删除' });
      } else {
        setMessage({ type: 'error', text: '删除设置失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      // 3秒后清除消息
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 获取设置项的描述
  const getSettingDescription = (key: SettingKey): string => {
    const descriptions: Record<SettingKey, string> = {
      MODEL_PROVIDER_URL: '模型提供商URL',
      AGENT_PROVIDER_URL: '代理提供商URL',
      MODEL_PROVIDER_API_KEY: '模型提供商API密钥',
      FINNHUB_API_KEY: 'Finnhub API密钥',
      LANGSMITH_API_KEY: 'LangSmith API密钥',
      FINANCIAL_DATASETS_KEY: 'Financial Datasets密钥',
      TAVILY_API_KEY: 'Tavily API密钥',
    };

    return descriptions[key] || key;
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系统设置</h1>
      </div>

      {message && (
        <div className={`p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6">
        {ALLOWED_KEYS.map((key) => (
          <div key={key} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium">{key}</label>
              <span className="text-sm text-gray-500">{getSettingDescription(key)}</span>
            </div>

            <div className="flex gap-2">
              <Input
                type="text"
                value={settings[key] || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                className="flex-1 border rounded px-3 py-2"
                placeholder={`请输入${key}的值`}
              />
              <Button
                onClick={() => updateSetting(key, settings[key] || '')}
                disabled={saving}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </Button>
              <Button
                onClick={() => deleteSetting(key)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                删除
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}