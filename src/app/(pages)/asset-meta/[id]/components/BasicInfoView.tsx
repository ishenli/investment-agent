'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { Building2, Globe, Hash, Tag } from 'lucide-react';
import { AssetMetaType } from '@/types/assetMeta';
import { useTranslation } from 'react-i18next';

interface BasicInfoViewProps {
  assetMeta: AssetMetaType | null;
}

export function BasicInfoView({ assetMeta }: BasicInfoViewProps) {
  const { t } = useTranslation('asset-meta');
  
  if (!assetMeta) {
    return (
      <Alert>
        <AlertTitle>{t('error.unknown')}</AlertTitle>
        <AlertDescription>{t('error.unknown')}</AlertDescription>
      </Alert>
    );
  }

  const infoItems = [
    {
      icon: Hash,
      label: t('table.headers.symbol'),
      value: assetMeta.symbol,
    },
    {
      icon: Tag,
      label: t('form.fields.chineseName'),
      value: assetMeta.chineseName || t('error.unknown'),
    },
    {
      icon: Building2,
      label: t('form.fields.fullName'),
      value: assetMeta.fullName || t('error.unknown'),
    },
    {
      icon: Globe,
      label: t('table.headers.market'),
      value: assetMeta.market === 'CN' ? t('form.markets.CN') : assetMeta.market === 'HK' ? t('form.markets.HK') : t('form.markets.US'),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('basicInfo.title')}</CardTitle>
          <CardDescription>{t('basicInfo.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Logo 区域 */}
            <div className="flex-shrink-0">
              {assetMeta.logoUrl ? (
                <div className="w-32 h-32 rounded-lg overflow-hidden border bg-white flex items-center justify-center">
                  <img
                    src={assetMeta.logoUrl}
                    alt={`${assetMeta.symbol} logo`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // 图片加载失败时显示占位符
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg border bg-muted flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* 信息列表 */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {infoItems.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-base font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
