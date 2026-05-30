'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { get } from '@/app/lib/request/index';
import { useTranslation } from 'react-i18next';
import { RuntimeAssetEditor } from './RuntimeAssetEditor';
import type {
  AgentRuntime,
  RuntimeAssetMeta,
  RuntimeAssetListResponse,
  RuntimeAssetDetailResponse,
} from '@typings/agentRuntimeAsset';

const RUNTIMES: { value: AgentRuntime; label: string }[] = [
  { value: 'claude', label: 'Claude Code' },
  { value: 'hermes', label: 'Hermes Agent' },
];

export function AgentRuntimeAssetsView() {
  const { t } = useTranslation('setting');
  const [runtime, setRuntime] = useState<AgentRuntime>('claude');
  const [assetLists, setAssetLists] = useState<RuntimeAssetListResponse[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('memory');
  const [assetDetail, setAssetDetail] = useState<RuntimeAssetDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchAssetList = useCallback(async () => {
    try {
      setLoading(true);
      const response: { success: boolean; data: RuntimeAssetListResponse[] } =
        await get('/api/agent/runtime-assets');
      if (response.success) {
        setAssetLists(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch runtime assets', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssetDetail = useCallback(
    async (rt: AgentRuntime, aid: string) => {
      try {
        setDetailLoading(true);
        const response: { success: boolean; data: RuntimeAssetDetailResponse } = await get(
          `/api/agent/runtime-assets?runtime=${rt}&assetId=${aid}`,
        );
        if (response.success) {
          setAssetDetail(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch asset detail', err);
        setAssetDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchAssetList();
  }, [fetchAssetList]);

  useEffect(() => {
    fetchAssetDetail(runtime, selectedAssetId);
  }, [runtime, selectedAssetId, fetchAssetDetail]);

  const currentAssets = assetLists.find((r) => r.runtime === runtime)?.assets ?? [];

  const handleRuntimeChange = (value: string) => {
    setRuntime(value as AgentRuntime);
    setSelectedAssetId('memory');
    setAssetDetail(null);
  };

  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-lg text-muted-foreground">
          {t('agent.runtimeAssets.loading', '加载中...')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={runtime} onValueChange={handleRuntimeChange}>
        <TabsList>
          {RUNTIMES.map((rt) => (
            <TabsTrigger key={rt.value} value={rt.value}>
              {rt.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {RUNTIMES.map((rt) => (
          <TabsContent key={rt.value} value={rt.value}>
            <div className="flex gap-4 mt-2">
              <div className="w-48 shrink-0 flex flex-col gap-1">
                {currentAssets.map((asset: RuntimeAssetMeta) => (
                  <button
                    key={asset.assetId}
                    onClick={() => handleAssetSelect(asset.assetId)}
                    className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedAssetId === asset.assetId
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{asset.displayName}</div>
                    <div
                      className={`text-xs ${
                        selectedAssetId === asset.assetId
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {asset.exists
                        ? t('agent.runtimeAssets.exists', '已创建')
                        : t('agent.runtimeAssets.notExists', '未创建')}
                    </div>
                  </button>
                ))}
              </div>

              <Card className="flex-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {assetDetail?.meta.displayName ?? selectedAssetId}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {detailLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : assetDetail ? (
                    <RuntimeAssetEditor
                      key={`${runtime}-${selectedAssetId}`}
                      runtime={runtime}
                      assetId={selectedAssetId}
                      meta={assetDetail.meta}
                      initialContent={assetDetail.content}
                    />
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      {t('agent.runtimeAssets.selectAsset', '请选择一个资源文件')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
