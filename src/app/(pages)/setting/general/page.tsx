'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Label } from '@renderer/components/ui/label';
import { Input } from '@renderer/components/ui/input';
import { Button } from '@renderer/components/ui/button';
import { Switch } from '@renderer/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select';
import { Separator } from '@renderer/components/ui/separator';
import { Check, Globe, Bell, Shield, Info } from 'lucide-react';

type GeneralSettingsProps = object

export default function GeneralSettings({
  // Add props if needed
}: GeneralSettingsProps) {
  const [language, setLanguage] = React.useState('zh-CN');
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [autoSave, setAutoSave] = React.useState(true);
  const [dataRetention, setDataRetention] = React.useState('30d');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">通用设置</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理您的通用偏好设置
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            设置已保存
          </div>
        )}
      </div>

      {/* Language & Region */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>语言和地区</CardTitle>
              <CardDescription>设置界面语言和地区偏好</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2">
 <div className="space-y-2">
            <Label htmlFor="language">语言</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue placeholder="选择语言" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="zh-TW">繁體中文</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
                <SelectItem value="ja-JP">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">时区</Label>
            <Select defaultValue="Asia/Shanghai">
              <SelectTrigger id="timezone">
                <SelectValue placeholder="选择时区" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Shanghai">亚洲/上海 (GMT+8)</SelectItem>
                <SelectItem value="Asia/Tokyo">亚洲/东京 (GMT+9)</SelectItem>
                <SelectItem value="America/New_York">美洲/纽约 (GMT-5)</SelectItem>
                <SelectItem value="Europe/London">欧洲/伦敦 (GMT+0)</SelectItem>
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
              <CardTitle>通知设置</CardTitle>
              <CardDescription>管理通知偏好</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">启用通知</Label>
              <p className="text-sm text-muted-foreground">接收重要更新和提醒</p>
            </div>
            <Switch
              id="notifications"
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoSave">自动保存</Label>
              <p className="text-sm text-muted-foreground">自动保存您的更改</p>
            </div>
            <Switch
              id="autoSave"
              checked={autoSave}
              onCheckedChange={setAutoSave}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
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
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline">取消</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  );
}