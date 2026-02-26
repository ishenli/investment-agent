'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Label } from '@renderer/components/ui/label';
import { Button } from '@renderer/components/ui/button';
import { Switch } from '@renderer/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select';
import { Separator } from '@renderer/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar';
import { Check, Globe, Bell, User, Camera, Trash2 } from 'lucide-react';
import { useUserStore } from '@renderer/store/user';
import { SupportedLanguage } from '@typings/user';
import { useTranslation } from 'react-i18next';
import i18nInstance, { defaultLanguage } from '@renderer/lib/i18n';

type GeneralSettingsProps = object

export default function GeneralSettings({
  // Add props if needed
}: GeneralSettingsProps) {
  const { t } = useTranslation('setting');
  // const [dataRetention, setDataRetention] = React.useState('30d');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 从store获取和更新所有设置，优先使用 i18n 当前语言避免闪烁
  const storeLanguage = useUserStore(state => state.preference.language);
  const currentLanguage = storeLanguage || (i18nInstance.language as SupportedLanguage) || defaultLanguage;
  const currentNotifications = useUserStore(state => state.preference.enableNotifications ?? false);
  const currentAutoSave = useUserStore(state => state.preference.autoSave ?? true);
  const currentAvatar = useUserStore(state => state.avatar);
  const updatePreference = useUserStore(state => state.updatePreference);
  const updateAvatar = useUserStore(state => state.updateAvatar);

  const handleLanguageChange = async (value: string) => {
    const newLanguage = value as SupportedLanguage;
    await updatePreference({ language: newLanguage });
  };

  const handleNotificationsChange = async (checked: boolean) => {
    await updatePreference({ enableNotifications: checked });
  };

  const handleAutoSaveChange = async (checked: boolean) => {
    await updatePreference({ autoSave: checked });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return;
    }

    // 验证文件大小 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    // 转换为 base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      await updateAvatar(base64);
    };
    reader.readAsDataURL(file);

    // 清除 input 以便可以再次选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    await updateAvatar('');
  };

  const handleSave = async () => {
    setSaving(true);
    // 实际保存操作已经在各个变更处理函数中完成
    // 这里可以执行额外的保存逻辑
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('general.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('general.description')}
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            {t('actions.save')}
          </div>
        )}
      </div>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('general.avatar.title')}</CardTitle>
              <CardDescription>{t('general.avatar.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={currentAvatar} alt="Avatar" />
              <AvatarFallback className="text-lg">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAvatarClick}>
                  <Camera className="h-4 w-4 mr-2" />
                  {t('general.avatar.changeAvatar')}
                </Button>
                {currentAvatar && (
                  <Button variant="outline" size="sm" onClick={handleRemoveAvatar}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('general.avatar.removeAvatar')}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Language & Region */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('general.language')}</CardTitle>
              <CardDescription>{t('general.regionDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2">
            <div className="space-y-2">
            <Label htmlFor="language">{t('general.language')}</Label>
            <Select value={currentLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger id="language">
                <SelectValue placeholder={t('general.selectLanguage')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">{t('language.zh-CN')}</SelectItem>
                <SelectItem value="en-US">{t('language.en-US')}</SelectItem>

              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">{t('general.timezone')}</Label>
            <Select defaultValue="Asia/Shanghai">
              <SelectTrigger id="timezone">
                <SelectValue placeholder={t('general.selectTimezone')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Shanghai">{t('general.asiaShanghai')}</SelectItem>
                <SelectItem value="Asia/Tokyo">{t('general.asiaTokyo')}</SelectItem>
                <SelectItem value="America/New_York">{t('general.americaNewYork')}</SelectItem>
                <SelectItem value="Europe/London">{t('general.europeLondon')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('general.notifications')}</CardTitle>
              <CardDescription>{t('general.notificationDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">{t('general.enableNotification')}</Label>
              <p className="text-sm text-muted-foreground">{t('general.receiveUpdates')}</p>
            </div>
            <Switch
              id="notifications"
              checked={currentNotifications}
              onCheckedChange={handleNotificationsChange}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoSave">{t('general.autoSave')}</Label>
              <p className="text-sm text-muted-foreground">{t('general.autoSaveDescription')}</p>
            </div>
            <Switch
              id="autoSave"
              checked={currentAutoSave}
              onCheckedChange={handleAutoSaveChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>隐私与安全</CardTitle>
              <CardDescription>管理您的隐私设置</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="data-retention">数据保留期限</Label>
            <Select value={dataRetention} onValueChange={setDataRetention}>
              <SelectTrigger id="data-retention">
                <SelectValue placeholder="选择保留期限" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7天</SelectItem>
                <SelectItem value="30d">30天</SelectItem>
                <SelectItem value="90d">90天</SelectItem>
                <SelectItem value="365d">1年</SelectItem>
                <SelectItem value="forever">永久保留</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card> */}

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline">{t('actions.cancel')}</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('actions.saving') : t('actions.saveSettings')}
        </Button>
      </div>
    </div>
  );
}