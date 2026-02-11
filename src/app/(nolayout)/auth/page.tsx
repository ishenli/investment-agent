'use client';

import { useEffect, useState } from 'react';
import { RegisterForm } from './auth-forms/RegisterForm';
import { LoginForm } from './auth-forms/LoginForm';
import { Alert } from '@renderer/components/ui/alert';

export default function AuthPage() {
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const checkUsers = async () => {
      try {
        const response = await fetch('/api/auth/has-users');
        const data = await response.json();
        if (data.success) {
          setHasUsers(data.data.hasUsers);
          setShowLogin(data.data.hasUsers);
        }
      } catch (err) {
        setError('检查用户状态失败');
      } finally {
        setLoading(false);
      }
    };

    checkUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert>
          <div className="text-sm">{error}</div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {showLogin ? (
        <div className="w-full max-w-md">
          <LoginForm />
          <p className="text-center mt-4 text-sm text-muted-foreground">
            没有账号？{' '}
            <button
              type="button"
              onClick={() => setShowLogin(false)}
              className="text-primary hover:underline"
            >
              去注册
            </button>
          </p>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <RegisterForm />
          {!hasUsers && (
            <p className="text-center mt-4 text-sm text-muted-foreground">
              这是第一个账户，创建后将跳转到交易账户设置
            </p>
          )}
          {hasUsers && (
            <p className="text-center mt-4 text-sm text-muted-foreground">
              已有账号？{' '}
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="text-primary hover:underline"
              >
                去登录
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}