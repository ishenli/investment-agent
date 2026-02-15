'use client';

import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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

/**
 * Render the API key/settings management UI with per-key fetch, update, and delete actions.
 *
 * Displays a list of allowed setting keys with editable inputs and Save/Delete controls.
 * On mount, it fetches existing settings and merges them into the local state.
 * Saving updates a single setting via PUT and reflects the change in state on success.
 * Deleting removes a setting via DELETE and clears its value on success.
 * Success and error messages are shown briefly after operations.
 *
 * @returns A React element containing the settings management interface.
 */
export default function SettingPage() {
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
        setSettings((prev) => ({
          ...prev,
          [key]: '',
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
        <h1 className="text-2xl font-bold">API KEY 配置</h1>
      </div>

      {message && (
        <div
          className={`p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6">
        {ALLOWED_KEYS.map((key) => (
          <div key={key} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium">
                {getSettingDescription(key)}({key})
              </label>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={visibleKeys[key] ? 'text' : 'password'}
                  value={settings[key] || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="border rounded px-3 py-2 pr-10"
                  placeholder={`请输入${key}的值`}
                />
                {isSensitiveKey(key) && (
                  <button
                    type="button"
                    onClick={() => toggleVisibility(key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {visibleKeys[key] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
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