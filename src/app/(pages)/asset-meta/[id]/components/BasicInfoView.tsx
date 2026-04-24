'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { Building2, Globe, Hash, Tag, Layers, DollarSign, Database } from 'lucide-react';
import { AssetMetaType } from '@/types/assetMeta';
import { useTranslation } from 'react-i18next';

interface BasicInfoViewProps {
  assetMeta: AssetMetaType | null;
}

const assetTypeColorMap: Record<string, string> = {
  stock: 'bg-blue-100 text-blue-800',
  etf: 'bg-purple-100 text-purple-800',
  fund: 'bg-emerald-100 text-emerald-800',
  crypto: 'bg-orange-100 text-orange-800',
};

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

  const marketLabel = assetMeta.market === 'CN' ? t('form.markets.CN') : assetMeta.market === 'HK' ? t('form.markets.HK') : t('form.markets.US');

  const commonItems = [
    {
      icon: Hash,
      label: t('table.headers.symbol'),
      value: assetMeta.symbol,
    },
    {
      icon: Tag,
      label: t('form.fields.chineseName'),
      value: assetMeta.chineseName || '-',
    },
    {
      icon: Building2,
      label: t('form.fields.fullName'),
      value: assetMeta.fullName || '-',
    },
    {
      icon: Globe,
      label: t('table.headers.market'),
      value: marketLabel,
    },
    {
      icon: Layers,
      label: t('basicInfo.fields.assetType'),
      value: t(`assetTypeLabels.${assetMeta.assetType}`),
      badge: true,
      badgeColor: assetTypeColorMap[assetMeta.assetType],
    },
    {
      icon: DollarSign,
      label: t('basicInfo.fields.currency'),
      value: assetMeta.currency,
    },
    {
      icon: Database,
      label: t('basicInfo.fields.source'),
      value: assetMeta.source,
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
              {commonItems.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    {'badge' in item && item.badge ? (
                      <Badge className={`mt-1 ${item.badgeColor || ''}`}>{item.value}</Badge>
                    ) : (
                      <p className="text-base font-medium">{item.value}</p>
                    )}
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
