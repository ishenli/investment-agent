'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Label } from '@renderer/components/ui/label';
import { Button } from '@renderer/components/ui/button';
import { Switch } from '@renderer/components/ui/switch';
import { Separator } from '@renderer/components/ui/separator';
import { Bell, Volume2, Check } from 'lucide-react';
import { get, put } from '@/app/lib/request';
import { notificationManager } from '@/app/lib/notification';
import type { NotificationPreferences, NotificationTypeValue } from '@/types/notification';

const NOTIFICATION_TYPE_LABELS: Record<NotificationTypeValue, string> = {
  report_completed: '报告完成',
  analysis_completed: '分析完成',
  data_refreshed: '数据刷新',
  system_announcement: '系统公告',
  trade_executed: '交易执行',
  price_alert: '价格预警',
};

const NOTIFICATION_TYPE_ORDER: NotificationTypeValue[] = [
  'price_alert',
  'trade_executed',
  'report_completed',
  'analysis_completed',
  'data_refreshed',
  'system_announcement',
];

export default function NotificationSettings() {
  const [preferences, setPreferences] = React.useState<NotificationPreferences>({
    osNotificationsEnabled: true,
    soundEnabled: false,
    types: {},
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setIsLoading(true);
    get<NotificationPreferences>('/api/settings/notification')
      .then((data) => {
        setPreferences({
          osNotificationsEnabled: data.osNotificationsEnabled ?? true,
          soundEnabled: data.soundEnabled ?? false,
          types: data.types || {},
        });
      })
      .catch(() => {
        notificationManager.toast({ title: '加载通知设置失败', variant: 'error' });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleMasterToggle = (checked: boolean) => {
    setPreferences((prev) => ({ ...prev, osNotificationsEnabled: checked }));
  };

  const handleSoundToggle = (checked: boolean) => {
    setPreferences((prev) => ({ ...prev, soundEnabled: checked }));
  };

  const handleTypeToggle = (type: NotificationTypeValue, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      types: { ...prev.types, [type]: checked },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await put('/api/settings/notification', preferences);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      notificationManager.toast({ title: '保存通知设置失败', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const allTypesEnabled =
    preferences.osNotificationsEnabled &&
    NOTIFICATION_TYPE_ORDER.every((type) => preferences.types[type] !== false);

  const handleToggleAllTypes = (checked: boolean) => {
    const newTypes: Record<string, boolean> = {};
    NOTIFICATION_TYPE_ORDER.forEach((type) => {
      newTypes[type] = checked;
    });
    setPreferences((prev) => ({ ...prev, types: newTypes }));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">通知设置</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理通知偏好和推送设置
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            已保存
          </div>
        )}
      </div>

      {/* Master Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>系统通知</CardTitle>
              <CardDescription>控制是否接收操作系统级别的通知</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="os-notifications">启用 OS 通知</Label>
              <p className="text-sm text-muted-foreground">
                通过系统通知中心接收重要提醒
              </p>
            </div>
            <Switch
              id="os-notifications"
              checked={preferences.osNotificationsEnabled}
              onCheckedChange={handleMasterToggle}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound">提示音</Label>
              <p className="text-sm text-muted-foreground">通知到达时播放声音（暂不支持）</p>
            </div>
            <Switch
              id="sound"
              checked={preferences.soundEnabled}
              onCheckedChange={handleSoundToggle}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Per-Type Toggles */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Volume2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>通知类型</CardTitle>
              <CardDescription>按类型控制接收哪些通知</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>全选</Label>
              <p className="text-sm text-muted-foreground">快速开启或关闭所有类型</p>
            </div>
            <Switch
              id="toggle-all-types"
              checked={allTypesEnabled}
              onCheckedChange={handleToggleAllTypes}
            />
          </div>

          <Separator />

          {NOTIFICATION_TYPE_ORDER.map((type) => (
            <div key={type} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={`type-${type}`}>{NOTIFICATION_TYPE_LABELS[type]}</Label>
                <p className="text-sm text-muted-foreground">
                  {type === 'price_alert'
                    ? '价格达到设定阈值时提醒'
                    : type === 'trade_executed'
                      ? '交易成功执行后提醒'
                      : type === 'report_completed'
                        ? '报告生成完成后提醒'
                        : type === 'analysis_completed'
                          ? '分析任务完成后提醒'
                          : type === 'data_refreshed'
                            ? '市场数据更新后提醒'
                            : '系统维护和功能更新公告'}
                </p>
              </div>
              <Switch
                id={`type-${type}`}
                checked={preferences.types[type] !== false}
                onCheckedChange={(checked) => handleTypeToggle(type, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline">取消</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  );
}
