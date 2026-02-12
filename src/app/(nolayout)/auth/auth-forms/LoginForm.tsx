'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { PasswordInput } from '../components/password-input';
import { Alert } from '@renderer/components/ui/alert';
import { useAuthStore } from '@renderer/store/auth/store';
import type { LoginInput } from '@/types/auth';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, setLoading, loading, error, setError } = useAuthStore();

  const [formData, setFormData] = useState<LoginInput>({
    username: '',
    password: '',
  });

  // 获取重定向URL
  const redirectUrl = searchParams.get('redirect') || '/asset';

  // 检查是否已登录
  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1];

    if (token) {
      // 如果有token且有效，直接跳转到目标页面
      router.push(redirectUrl);
    }
  }, [redirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.username || !formData.password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // 设置认证状态
        setAuth(data.data.user, data.data.token);

        // 将 token 保存到 cookie（用于 middleware 验证）
        const maxAge = 7 * 24 * 60 * 60; // 7天
        document.cookie = `auth_token=${data.data.token}; path=/; max-age=${maxAge}; secure; samesite=lax`;

        // 跳转到目标页面或默认页面
        router.push(redirectUrl);
      } else {
        setError(data.message || '登录失败，请稍后重试');
      }
    } catch (err) {
      setError('网络错误，请检查连接后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">欢迎回来</CardTitle>
        <CardDescription>输入您的用户名和密码登录</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <div className="text-sm">{error}</div>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              type="text"
              placeholder="输入用户名"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <PasswordInput
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="输入密码"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}