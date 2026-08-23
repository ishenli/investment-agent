'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCode } from 'antd';
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { useTranslation } from 'react-i18next';

type RegistrationStatus = 'idle' | 'starting' | 'waiting' | 'success' | 'error';

interface StartResponse {
  sessionId: string;
  verificationUrl: string;
  intervalMs: number;
}

interface PollResponse {
  status: 'waiting' | 'completed' | 'failed' | 'expired';
  intervalMs: number;
  botName?: string;
  pairedOpenId?: string;
  errorCode?: string;
  restartError?: boolean;
}

class RegistrationRequestError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export interface FeishuAppRegistrationProps {
  onSuccess: () => void | Promise<void>;
}

async function registrationRequest<T>(body: Record<string, string>): Promise<T> {
  const response = await fetch('/api/channel/feishu/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new RegistrationRequestError(
      result.error || 'Registration failed',
      response.status >= 500,
    );
  }
  return result.data as T;
}

export function FeishuAppRegistration({ onSuccess }: FeishuAppRegistrationProps) {
  const { t } = useTranslation('setting');
  const [status, setStatus] = useState<RegistrationStatus>('idle');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [message, setMessage] = useState('');
  const sessionIdRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<(sessionId: string, delayMs: number) => void>(() => undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const poll = useCallback(
    async (sessionId: string, delayMs: number) => {
      clearTimer();
      timerRef.current = setTimeout(async () => {
        if (sessionIdRef.current !== sessionId) return;
        try {
          const data = await registrationRequest<PollResponse>({ action: 'poll', sessionId });
          if (sessionIdRef.current !== sessionId) return;
          if (data.status === 'waiting') {
            pollRef.current(sessionId, data.intervalMs);
            return;
          }
          sessionIdRef.current = '';
          clearTimer();
          if (data.status === 'completed') {
            setStatus('success');
            setMessage(
              data.restartError
                ? t(
                    'channel.feishu.registrationRestartWarning',
                    '机器人已创建，请手动保存或重启渠道',
                  )
                : t('channel.feishu.registrationSuccess', '飞书机器人已创建并完成配对'),
            );
            await onSuccess();
            return;
          }
          setStatus('error');
          setMessage(
            data.errorCode === 'access_denied'
              ? t('channel.feishu.registrationDenied', '已取消飞书授权')
              : data.errorCode === 'storage_failed'
                  ? t(
                      'channel.feishu.registrationStorageFailed',
                      '凭据保存失败，请重试',
                    )
                : t('channel.feishu.registrationFailed', '飞书机器人创建失败，请重试'),
          );
        } catch (error) {
          if (sessionIdRef.current !== sessionId) return;
          if (error instanceof RegistrationRequestError && error.retryable) {
            pollRef.current(sessionId, delayMs);
            return;
          }
          sessionIdRef.current = '';
          setStatus('error');
          setMessage(t('channel.feishu.registrationFailed', '飞书机器人创建失败，请重试'));
        }
      }, delayMs);
    },
    [clearTimer, onSuccess, t],
  );

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const start = useCallback(async () => {
    clearTimer();
    sessionIdRef.current = '';
    setStatus('starting');
    setVerificationUrl('');
    setMessage('');
    try {
      const data = await registrationRequest<StartResponse>({ action: 'start' });
      sessionIdRef.current = data.sessionId;
      setVerificationUrl(data.verificationUrl);
      setStatus('waiting');
      pollRef.current(data.sessionId, data.intervalMs);
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : t('channel.feishu.registrationFailed', '飞书机器人创建失败，请重试'),
      );
    }
  }, [clearTimer, t]);

  const cancel = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    sessionIdRef.current = '';
    clearTimer();
    setStatus('idle');
    setVerificationUrl('');
    setMessage('');
    if (sessionId) {
      try {
        await registrationRequest({ action: 'cancel', sessionId });
      } catch {
        // The server session also expires automatically.
      }
    }
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return (
    <div className="space-y-4 border-b pb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            {t('channel.feishu.registrationTitle', '扫码创建飞书机器人')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('channel.feishu.registrationHint', '授权后自动保存凭据并允许当前飞书用户私聊')}
          </p>
        </div>
        {(status === 'idle' || status === 'error' || status === 'success') && (
          <Button variant="outline" size="sm" onClick={() => void start()}>
            <RefreshCw className="h-4 w-4" />
            {status === 'success'
              ? t('channel.feishu.registrationAgain', '重新绑定')
              : t('channel.feishu.registrationStart', '开始授权')}
          </Button>
        )}
      </div>

      {status === 'starting' && (
        <div className="flex h-28 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t('channel.feishu.registrationStarting', '正在创建授权会话...')}
        </div>
      )}

      {status === 'waiting' && verificationUrl && (
        <div className="flex flex-col items-center gap-4 rounded border border-dashed p-5 sm:flex-row sm:items-start">
          <QRCode value={verificationUrl} size={180} bordered={false} />
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:pt-3">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('channel.feishu.registrationWaiting', '等待飞书授权确认')}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => window.open(verificationUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-4 w-4" />
                {t('channel.feishu.registrationOpen', '在浏览器中打开')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void cancel()}>
                <X className="h-4 w-4" />
                {t('actions.cancel', '取消')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          {message}
        </div>
      )}
      {status === 'error' && <p className="text-sm text-destructive">{message}</p>}
    </div>
  );
}
