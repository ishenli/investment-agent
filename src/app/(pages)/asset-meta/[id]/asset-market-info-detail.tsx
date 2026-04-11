'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { MarketInfoTabs } from './components/MarketInfoTabs';
import { TabNavigation } from './components/TabNavigation';
import { LatestMarketInfoView } from './components/LatestMarketInfoView';
import { HistoryMarketInfoView } from './components/HistoryMarketInfoView';
import { CompanyInfoView } from './components/CompanyInfoView';
import { AddCompanyInfoDialog } from './components/AddCompanyInfoDialog';
import { DeleteConfirmationDialog } from './components/DeleteConfirmationDialog';
import { InvestmentMemoView } from './components/InvestmentMemoView';
import { BasicInfoView } from './components/BasicInfoView';
import { AssetMetaType } from '@/types/assetMeta';
import { AssetMarketInfoType } from '@/types/marketInfo';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

type AssetCompanyInfoType = {
  id: number;
  assetMetaId: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export function AssetMarketInfoDetail({ assetMetaId }: { assetMetaId: number }) {
  const { t } = useTranslation('asset-meta');
  const router = useRouter();
  const [marketInfo, setMarketInfo] = useState<AssetMarketInfoType | null>(null);
  const [marketInfos, setMarketInfos] = useState<AssetMarketInfoType[]>([]);
  const [companyInfos, setCompanyInfos] = useState<AssetCompanyInfoType[]>([]);
  const [assetMeta, setAssetMeta] = useState<AssetMetaType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'latest' | 'history' | 'company' | 'basic-info' | 'investment-memo'>(
    'latest',
  );
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [infoToDelete, setInfoToDelete] = useState<AssetMarketInfoType | null>(null);
  const [companyInfoToDelete, setCompanyInfoToDelete] = useState<AssetCompanyInfoType | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 新增状态用于添加公司信息模态框
  const [addCompanyInfoDialogOpen, setAddCompanyInfoDialogOpen] = useState(false);
  const [savingCompanyInfo, setSavingCompanyInfo] = useState(false);
  const [editingCompanyInfo, setEditingCompanyInfo] = useState<AssetCompanyInfoType | null>(null);

  // 投资笔记编辑弹窗状态
  const [investmentMemoDialogOpen, setInvestmentMemoDialogOpen] = useState(false);

  // 基本信息编辑弹窗状态
  const [basicInfoDialogOpen, setBasicInfoDialogOpen] = useState(false);
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);
  const [basicInfoForm, setBasicInfoForm] = useState({
    chineseName: '',
    fullName: '',
    logoUrl: '',
  });

  const fetchAssetMeta = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/asset/meta?id=${assetMetaId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('error.unknown'));
      }

      const result = await response.json();
      setAssetMeta(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestMarketInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/asset/market-info/latest?assetMetaId=${assetMetaId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('errors.fetchDataFailed'));
      }

      const result = await response.json();
      const assetMarketInfo = result.data.assetMarketInfo;
      setMarketInfo(assetMarketInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketInfoList = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/asset/market-info/list?assetMetaId=${assetMetaId}&page=${page}&limit=10`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('errors.fetchDataFailed'));
      }

      const result = await response.json();
      setMarketInfos(result.data.data);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyInfoList = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/asset/company-info/list?assetMetaId=${assetMetaId}&page=1&limit=50`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('errors.fetchCompanyInfoFailed'));
      }

      const result = await response.json();
      setCompanyInfos(result.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    await fetchAssetMeta();
    if (activeTab === 'latest') {
      await fetchLatestMarketInfo();
    } else if (activeTab === 'history') {
      await fetchMarketInfoList(pagination.page);
    } else if (activeTab === 'company') {
      await fetchCompanyInfoList();
    }
  };

  useEffect(() => {
    fetchData();
  }, [assetMetaId, activeTab, pagination.page]);

  // 获取情感标签的颜色
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
      case t('sentiment.positive'):
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'negative':
      case t('sentiment.negative'):
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'neutral':
      case t('sentiment.neutral'):
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // 获取重要性标签的颜色
  const getImportanceColor = (importance: string) => {
    const importanceNum = parseInt(importance);
    if (importanceNum >= 8) return 'bg-red-100 text-red-800 hover:bg-red-200';
    if (importanceNum >= 5) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    return 'bg-green-100 text-green-800 hover:bg-green-200';
  };

  // 打开删除确认对话框
  const openDeleteDialog = (info: AssetMarketInfoType) => {
    setInfoToDelete(info);
    setCompanyInfoToDelete(null);
    setDeleteDialogOpen(true);
  };

  const openDeleteCompanyInfoDialog = (info: AssetCompanyInfoType) => {
    setCompanyInfoToDelete(info);
    setInfoToDelete(null);
    setDeleteDialogOpen(true);
  };

  // 关闭删除确认对话框
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setInfoToDelete(null);
    setCompanyInfoToDelete(null);
  };

  // 执行删除操作
  const handleDelete = async () => {
    if (!infoToDelete && !companyInfoToDelete) return;

    try {
      setDeleting(true);

      let url = '';
      if (infoToDelete) {
        url = `/api/asset/market-info?id=${infoToDelete.id}`;
      } else if (companyInfoToDelete) {
        url = `/api/asset/company-info?id=${companyInfoToDelete.id}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('delete.failed'));
      }

      // 如果删除的是当前显示的详情信息，则清空
      if (infoToDelete && marketInfo?.id === infoToDelete.id) {
        setMarketInfo(null);
      }

      // 重新获取数据
      await fetchData();

      // 关闭对话框
      closeDeleteDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setDeleting(false);
    }
  };

  // 跳转到市场纪要抓取页面
  const goToMarketInfoFetcher = () => {
    router.push(`/asset-market-info-fetcher?assetMetaId=${assetMetaId}`);
  };

  // 打开添加公司信息对话框
  const openAddCompanyInfoDialog = () => {
    setEditingCompanyInfo(null);
    setAddCompanyInfoDialogOpen(true);
  };

  const openEditCompanyInfoDialog = (info: AssetCompanyInfoType) => {
    setEditingCompanyInfo(info);
    setAddCompanyInfoDialogOpen(true);
  };

  // 关闭添加公司信息对话框
  const closeAddCompanyInfoDialog = () => {
    setAddCompanyInfoDialogOpen(false);
    setEditingCompanyInfo(null);
  };

  // 保存公司信息
  const handleSaveCompanyInfo = async (title: string, content: string) => {
    try {
      setSavingCompanyInfo(true);
      setError(null);

      const response = await fetch('/api/asset/company-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetMetaId,
          title,
          content,
          id: editingCompanyInfo?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('save.failed'));
      }

      // 重新获取公司信息列表
      await fetchCompanyInfoList();

      // 关闭对话框
      closeAddCompanyInfoDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
      throw err; // 重新抛出错误以便在对话框中处理
    } finally {
      setSavingCompanyInfo(false);
    }
  };

  // 保存投资笔记
  const handleSaveInvestmentMemo = async (content: string) => {
    try {
      setError(null);

      const response = await fetch('/api/asset/meta', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: assetMetaId,
          investmentMemo: content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('save.failed'));
      }

      // 重新获取资产元数据
      await fetchAssetMeta();
      // 关闭弹窗
      setInvestmentMemoDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'));
      throw err;
    }
  };

  // 打开编辑基本信息对话框
  const openEditBasicInfoDialog = () => {
    setBasicInfoForm({
      chineseName: assetMeta?.chineseName || '',
      fullName: assetMeta?.fullName || '',
      logoUrl: assetMeta?.logoUrl || '',
    });
    setBasicInfoDialogOpen(true);
  };

  // 关闭编辑基本信息对话框
  const closeEditBasicInfoDialog = () => {
    setBasicInfoDialogOpen(false);
  };

  // 保存基本信息
  const handleSaveBasicInfo = async () => {
    try {
      setSavingBasicInfo(true);
      setError(null);

      const response = await fetch('/api/asset/meta', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: assetMetaId,
          chineseName: basicInfoForm.chineseName || null,
          fullName: basicInfoForm.fullName || null,
          logoUrl: basicInfoForm.logoUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('save.failed'));
      }

      // 重新获取资产元数据
      await fetchAssetMeta();

      // 关闭弹窗
      closeEditBasicInfoDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setSavingBasicInfo(false);
    }
  };

  if (loading && !marketInfo && marketInfos.length === 0 && companyInfos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('error.title')}</AlertTitle>
        <AlertDescription>
          {error}
          <div className="mt-4">
            <button
              onClick={fetchData}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('error.reload')}
            </button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <MarketInfoTabs
        assetName={assetMeta?.chineseName || ''}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={fetchData}
        onAddMarketInfo={goToMarketInfoFetcher}
        onAddCompanyInfo={openAddCompanyInfoDialog}
        onAddInvestmentMemo={
          !assetMeta?.investmentMemo ? () => setInvestmentMemoDialogOpen(true) : undefined
        }
        onEditBasicInfo={openEditBasicInfoDialog}
      />

      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 最新信息视图 */}
      {activeTab === 'latest' && (
        <LatestMarketInfoView
          marketInfo={marketInfo}
          getSentimentColor={getSentimentColor}
          getImportanceColor={getImportanceColor}
        />
      )}

      {/* 历史记录视图 */}
      {activeTab === 'history' && (
        <HistoryMarketInfoView
          marketInfos={marketInfos}
          getSentimentColor={getSentimentColor}
          getImportanceColor={getImportanceColor}
          onViewDetail={(info) => {
            router.push(`/asset-market-info/detail/${info.id}`);
          }}
          onDelete={openDeleteDialog}
          pagination={pagination}
          setPagination={setPagination}
        />
      )}

      {/* 公司信息视图 */}
      {activeTab === 'company' && (
        <CompanyInfoView
          companyInfos={companyInfos}
          onEdit={openEditCompanyInfoDialog}
          onDelete={openDeleteCompanyInfoDialog}
        />
      )}

      {/* 基本信息视图 */}
      {activeTab === 'basic-info' && <BasicInfoView assetMeta={assetMeta} />}

      {/* 投资笔记视图 */}
      {activeTab === 'investment-memo' && (
        <InvestmentMemoView
          memo={assetMeta?.investmentMemo}
          onSave={handleSaveInvestmentMemo}
          isEditing={investmentMemoDialogOpen}
          onEditChange={setInvestmentMemoDialogOpen}
        />
      )}

      <AddCompanyInfoDialog
        key={addCompanyInfoDialogOpen ? (editingCompanyInfo?.id ?? 'new') : 'closed'}
        open={addCompanyInfoDialogOpen}
        onOpenChange={setAddCompanyInfoDialogOpen}
        onSave={handleSaveCompanyInfo}
        saving={savingCompanyInfo}
        error={error}
        setError={setError}
        initialData={editingCompanyInfo}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        deleting={deleting}
        infoToDelete={infoToDelete}
        companyInfoToDelete={companyInfoToDelete}
      />

      {/* 编辑基本信息对话框 */}
      <Dialog open={basicInfoDialogOpen} onOpenChange={setBasicInfoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('basicInfo.title')}</DialogTitle>
            <DialogDescription>{t('basicInfo.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">{t('basicInfo.fields.symbol')}</Label>
              <Input
                id="symbol"
                value={assetMeta?.symbol || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">{t('basicInfo.messages.symbolReadOnly')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chineseName">{t('basicInfo.fields.chineseName')}</Label>
              <Input
                id="chineseName"
                value={basicInfoForm.chineseName}
                onChange={(e) =>
                  setBasicInfoForm((prev) => ({ ...prev, chineseName: e.target.value }))
                }
                placeholder={t('basicInfo.placeholders.chineseName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('basicInfo.fields.fullName')}</Label>
              <Input
                id="fullName"
                value={basicInfoForm.fullName}
                onChange={(e) =>
                  setBasicInfoForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
                placeholder={t('basicInfo.placeholders.fullName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">{t('basicInfo.fields.logoPreview')}</Label>
              <Input
                id="logoUrl"
                value={basicInfoForm.logoUrl}
                onChange={(e) =>
                  setBasicInfoForm((prev) => ({ ...prev, logoUrl: e.target.value }))
                }
                placeholder={t('basicInfo.placeholders.logoUrl')}
              />
              {basicInfoForm.logoUrl && (
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{t('basicInfo.fields.logoPreview')}:</span>
                  <div className="w-16 h-16 rounded border overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={basicInfoForm.logoUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditBasicInfoDialog} disabled={savingBasicInfo}>
              {t('basicInfo.buttons.cancel')}
            </Button>
            <Button onClick={handleSaveBasicInfo} disabled={savingBasicInfo}>
              {savingBasicInfo ? t('basicInfo.buttons.saving') : t('basicInfo.buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
