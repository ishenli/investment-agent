'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { PasswordInput } from '../components/password-input';
import { Alert } from '@renderer/components/ui/alert';
import { useAuthStore } from '@renderer/store/auth/store';
import type { RegisterInput } from '@/types/auth';

interface RegisterFormData extends RegisterInput {
  passwordConfirm: string;
}

export function RegisterForm() {
  const router = useRouter();
  const { setAuth, setLoading, loading, error, setError, setToken } = useAuthStore();

  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    password: '',
    passwordConfirm: '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 验证用户名
    if (formData.username.length < 3) {
      errors.username = '用户名至少 3 个字符';
    } else if (formData.username.length > 30) {
      errors.username = '用户名最多 30 个字符';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = '用户名只能包含字母、数字和下划线';
    }

    // 验证密码
    if (formData.password.length < 6) {
      errors.password = '密码至少需要 6 个字符';
    }

    // 验证密码确认
    if (formData.password !== formData.passwordConfirm) {
      errors.passwordConfirm = '两次输入的密码不一致';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 设置认证状态
        setAuth(data.data.user, data.data.token);

        // 将 token 保存到 cookie(用于 middleware 验证)
        const maxAge = 7 * 24 * 60 * 60; // 7天
        // 在开发环境中不使用 secure 属性(HTTP),生产环境使用 secure(HTTPS)
        const isSecure = window.location.protocol === 'https:';
        const securePart = isSecure ? '; secure' : '';
        document.cookie = `auth_token=${data.data.token}; path=/; max-age=${maxAge}${securePart}; samesite=lax`;

        // 注册成功后跳转到资产页面
        router.push('/asset');
      } else {
        setError(data.message || '注册失败，请稍后重试');
      }
    } catch (err) {
      setError('网络错误，请检查连接后重试');
    } finally {
      setLoading(false);
    }
  };

  const isWeakPassword = formData.password.length > 0 && formData.password.length < 6;
  const isMediumPassword = formData.password.length >= 6 && formData.password.length < 10;
  const isStrongPassword = formData.password.length >= 10;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">创建账户</CardTitle>
        <CardDescription>输入用户名和密码来创建您的账户</CardDescription>
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
            />
            {validationErrors.username && (
              <p className="text-sm text-destructive">{validationErrors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <PasswordInput
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="输入密码"
              disabled={loading}
            />
            {formData.password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  <div
                    className={`h-1 flex-1 rounded ${isWeakPassword ? 'bg-destructive' : isMediumPassword ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                  />
                  <div
                    className={`h-1 flex-1 rounded ${isMediumPassword || isStrongPassword ? 'bg-yellow-500' : 'bg-muted'}`}
                  />
                  <div
                    className={`h-1 flex-1 rounded ${isStrongPassword ? 'bg-green-500' : 'bg-muted'}`}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {isWeakPassword && '弱密码'}
                  {isMediumPassword && '中等强度密码'}
                  {isStrongPassword && '强密码'}
                </p>
              </div>
            )}
            {validationErrors.password && (
              <p className="text-sm text-destructive">{validationErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">确认密码</Label>
            <PasswordInput
              id="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
              placeholder="再次输入密码"
              disabled={loading}
            />
            {validationErrors.passwordConfirm && (
              <p className="text-sm text-destructive">{validationErrors.passwordConfirm}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '创建中...' : '注册'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            注册即表示您同意我们的服务条款和隐私政策
          </p>
        </form>
      </CardContent>
    </Card>
  );
}