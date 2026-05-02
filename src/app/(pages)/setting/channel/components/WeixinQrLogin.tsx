'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import { RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';

type QrStatus = 'idle' | 'loading' | 'ready' | 'scaned' | 'success' | 'expired' | 'error';

/** Convert a QR code content string to a QR image URL via qrserver API */
function toQrImageUrl(value: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`;
}

export interface WeixinQrLoginProps {
  /** Called when login succeeds, with the saved credentials */
  onSuccess?: (credentials: { accountId: string; token: string }) => void;
}

export function WeixinQrLogin({ onSuccess }: WeixinQrLoginProps) {
  const { t } = useTranslation('setting');
  const [qrStatus, setQrStatus] = useState<QrStatus>('idle');
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [qrMessage, setQrMessage] = useState<string>('');
  const esRef = useRef<EventSource | null>(null);

  const stopQrSession = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const startQrLogin = useCallback(() => {
    stopQrSession();
    setQrStatus('loading');
    setQrImageUrl('');
    setQrMessage('');

    const es = new EventSource('/api/channel/weixin/qr');
    esRef.current = es;

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as Record<string, string>;
        if (data.type === 'qr') {
          // qrcodeUrl (qrcode_img_content) is the full liteapp URL WeChat scans
          // qrcodeValue (qrcode) is the raw hex token — fallback only
          // Neither is an image; generate the QR image ourselves via qrserver
          const scanValue = data.qrcodeUrl || data.qrcodeValue || '';
          setQrImageUrl(scanValue ? toQrImageUrl(scanValue) : '');
          setQrStatus('ready');
          setQrMessage('');
        } else if (data.type === 'status') {
          if (data.status === 'scaned') setQrStatus('scaned');
          if (data.status === 'expired') {
            setQrStatus('expired');
            setQrMessage(data.message ?? t('channel.weixin.qrExpired', '二维码已过期'));
          }
          if (data.message) setQrMessage(data.message);
        } else if (data.type === 'success') {
          setQrStatus('success');
          setQrMessage(`${t('channel.weixin.qrSuccess', '微信登录成功！')} Account ID: ${data.accountId}`);
          onSuccess?.({ accountId: data.accountId ?? '', token: data.token ?? '' });
          stopQrSession();
        } else if (data.type === 'error') {
          setQrStatus('error');
          setQrMessage(data.message ?? t('channel.weixin.qrError', '登录失败'));
          stopQrSession();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setQrStatus('error');
      setQrMessage(t('channel.weixin.qrConnectionLost', '连接中断，请重试'));
      stopQrSession();
    };
  }, [stopQrSession, onSuccess, t]);

  // Cleanup on unmount
  useEffect(() => stopQrSession, [stopQrSession]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-6">
      {/* idle */}
      {qrStatus === 'idle' && (
        <p className="text-sm text-muted-foreground text-center">
          {t(
            'channel.weixin.qrHint',
            '点击「开始扫码登录」，然后用微信扫描二维码，登录成功后凭证会自动保存',
          )}
        </p>
      )}

      {/* loading */}
      {qrStatus === 'loading' && (
        <div className="flex flex-col items-center gap-2 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t('channel.weixin.qrFetching', '正在获取二维码...')}
          </p>
        </div>
      )}

      {/* QR image */}
      {(qrStatus === 'ready' || qrStatus === 'scaned' || qrStatus === 'expired') && qrImageUrl && (
        <div className="relative">
          <Image
            src={qrImageUrl}
            alt="微信登录二维码"
            width={200}
            height={200}
            className={`rounded-lg border ${qrStatus === 'expired' ? 'opacity-40 grayscale' : ''}`}
            unoptimized
          />
          {qrStatus === 'scaned' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
              <div className="flex flex-col items-center gap-1 text-white">
                <CheckCircle2 className="h-10 w-10" />
                <span className="text-xs font-medium">
                  {t('channel.weixin.qrScaned', '已扫码')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* success */}
      {qrStatus === 'success' && (
        <div className="flex flex-col items-center gap-2 py-4">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            {t('channel.weixin.qrSuccess', '微信登录成功！')}
          </p>
        </div>
      )}

      {/* error */}
      {qrStatus === 'error' && (
        <p className="text-sm text-destructive text-center">
          {qrMessage || t('channel.weixin.qrError', '登录失败，请重试')}
        </p>
      )}

      {/* Status hint message */}
      {qrMessage && qrStatus !== 'error' && qrStatus !== 'success' && (
        <p className="text-xs text-muted-foreground text-center">{qrMessage}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {(qrStatus === 'idle' || qrStatus === 'error') && (
          <Button variant="outline" size="sm" onClick={startQrLogin}>
            {t('channel.weixin.qrStart', '开始扫码登录')}
          </Button>
        )}
        {(qrStatus === 'ready' ||
          qrStatus === 'scaned' ||
          qrStatus === 'expired' ||
          qrStatus === 'loading') && (
          <Button
            variant="outline"
            size="sm"
            onClick={startQrLogin}
            disabled={qrStatus === 'loading'}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            {t('channel.weixin.qrRefresh', '重新获取')}
          </Button>
        )}
        {qrStatus === 'success' && (
          <Button variant="outline" size="sm" onClick={startQrLogin}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            {t('channel.weixin.qrRelogin', '重新登录')}
          </Button>
        )}
      </div>
    </div>
  );
}
