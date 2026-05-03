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
import { useTranslation } from 'react-i18next';


const NOTIFICATION_TYPE_ORDER: NotificationTypeValue[] = [
  'price_alert',
  'trade_executed',
  'report_completed',
  'analysis_completed',
  'data_refreshed',
  'system_announcement',
];

export default function NotificationSettings() {
  const { t } = useTranslation("settingNotification");
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
          <h1 className="text-2xl font-bold">{t('notifications')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('notificationDescription' as any)}
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
              <CardTitle>{t('general.enableNotification' as any)}</CardTitle>
              <CardDescription>{t('notificationDescription' as any)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="os-notifications">{t('general.enableNotification' as any)}</Label>
              <p className="text-sm text-muted-foreground">
                {t('notificationDescription' as any)}
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
              <Label htmlFor="sound">{t('general.enableNotification' as any)}</Label>
              <p className="text-sm text-muted-foreground">{t('notificationDescription' as any)}</p>
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
              <CardTitle>{t('general.enableNotification' as any)}</CardTitle>
              <CardDescription>{t('notificationDescription' as any)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('actions.selectAll' as any)}</Label>
              <p className="text-sm text-muted-foreground">{t('notificationDescription' as any)}</p>
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
                <Label htmlFor={`type-${type}`}>{t(`type.${type}` as any)}</Label>
                <p className="text-sm text-muted-foreground">
                  {t(`descriptions.${type}` as any)}
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
        <Button variant="outline">{t('actions.cancel' as any)}</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t('actions.saving' as any) : t('actions.saveSettings' as any)}
        </Button>
      </div>
    </div>
  );
}
