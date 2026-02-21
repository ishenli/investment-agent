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

interface BasicInfoViewProps {
  assetMeta: AssetMetaType | null;
}

export function BasicInfoView({ assetMeta }: BasicInfoViewProps) {
  if (!assetMeta) {
    return (
      <Alert>
        <AlertTitle>暂无数据</AlertTitle>
        <AlertDescription>当前没有可用的资产基本信息。</AlertDescription>
      </Alert>
    );
  }

  const infoItems = [
    {
      icon: Hash,
      label: '股票代码',
      value: assetMeta.symbol,
    },
    {
      icon: Tag,
      label: '中文名称',
      value: assetMeta.chineseName || '未设置',
    },
    {
      icon: Building2,
      label: '英文全称',
      value: assetMeta.fullName || '未设置',
    },
    {
      icon: Globe,
      label: '市场',
      value: assetMeta.market === 'CN' ? 'A股' : assetMeta.market === 'HK' ? '港股' : '美股',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>资产基本信息</CardTitle>
          <CardDescription>查看和编辑资产的基本信息</CardDescription>
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
