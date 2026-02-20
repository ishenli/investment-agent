'use client';

import * as React from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';

export default function ThemeSettingsPage() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-lg text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const themeOptions = [
    { value: 'light', label: '浅色模式', icon: Sun, description: '使用浅色界面主题' },
    { value: 'dark', label: '深色模式', icon: Moon, description: '使用深色界面主题' },
    { value: 'system', label: '跟随系统', icon: Monitor, description: '根据系统设置自动切换主题' },
  ] as const;

  return (
    <div className="flex-1 flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">主题设置</h1>
          <p className="text-sm text-muted-foreground mt-1">
            自定义您的界面外观和主题
          </p>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>界面主题</CardTitle>
          <CardDescription>选择您喜欢的界面主题风格</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto w-full">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <Button
                  key={option.value}
                  variant={isActive ? 'default' : 'outline'}
                  className={`
                    h-auto p-5 flex flex-col gap-3 justify-start items-center
                    ${isActive ? 'border-primary' : 'hover:border-muted-foreground/50'}
                    min-h-[160px] w-full
                  `}
                  onClick={() => setTheme(option.value)}
                >
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                  `}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className="font-medium">{option.label}</span>
                  </div>
                  {isActive && (
                    <Check className="h-4 w-4 mt-1" />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>主题预览</CardTitle>
          <CardDescription>当前主题效果预览</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary">这是主色调示例</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">这是辅助色示例</p>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <p className="text-sm">这是背景色示例</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}