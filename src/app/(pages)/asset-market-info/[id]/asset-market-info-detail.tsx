'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { MarketInfoTabs } from './components/MarketInfoTabs';
import { TabNavigation } from './components/TabNavigation';
import { LatestMarketInfoView } from './components/LatestMarketInfoView';
import { HistoryMarketInfoView } from './components/HistoryMarketInfoView';
import { CompanyInfoView } from './components/CompanyInfoView';
import { AddCompanyInfoDialog } from './components/AddCompanyInfoDialog';
import { DeleteConfirmationDialog } from './components/DeleteConfirmationDialog';
import { InvestmentMemoView } from './components/InvestmentMemoView';
import { AssetMetaType } from '@/types/assetMeta';
import { AssetMarketInfoType } from '@/types/marketInfo';

type AssetCompanyInfoType = {
  id: number;
  assetMetaId: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export function AssetMarketInfoDetail({ assetMetaId }: { assetMetaId: number }) {
  const [marketInfo, setMarketInfo] = useState<AssetMarketInfoType | null>(null);
  const [marketInfos, setMarketInfos] = useState<AssetMarketInfoType[]>([]);
  const [companyInfos, setCompanyInfos] = useState<AssetCompanyInfoType[]>([]);
  const [assetMeta, setAssetMeta] = useState<AssetMetaType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'latest' | 'history' | 'company' | 'investment-memo'>('latest');
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

  const fetchAssetMeta = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/asset/meta?id=${assetMetaId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取资产信息失败');
      }

      const result = await response.json();
      setAssetMeta(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
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
        throw new Error(errorData.message || '获取数据失败');
      }

      const result = await response.json();
      const assetMarketInfo = result.data.assetMarketInfo;
      setMarketInfo(assetMarketInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
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
        throw new Error(errorData.message || '获取数据失败');
      }

      const result = await response.json();
      setMarketInfos(result.data.data);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
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
        throw new Error(errorData.message || '获取公司纪要失败');
      }

      const result = await response.json();
      setCompanyInfos(result.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
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
      case '积极':
        return 'bg-green-100 text-green-800';
      case 'negative':
      case '消极':
        return 'bg-red-100 text-red-800';
      case 'neutral':
      case '中性':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取重要性标签的颜色
  const getImportanceColor = (importance: string) => {
    const importanceNum = parseInt(importance);
    if (importanceNum >= 8) return 'bg-red-100 text-red-800';
    if (importanceNum >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
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
        throw new Error(errorData.message || '删除失败');
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
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setDeleting(false);
    }
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
        throw new Error(errorData.message || '保存公司信息失败');
      }

      // 重新获取公司信息列表
      await fetchCompanyInfoList();

      // 关闭对话框
      closeAddCompanyInfoDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
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
        throw new Error(errorData.message || '保存投资笔记失败');
      }

      // 重新获取资产元数据
      await fetchAssetMeta();
      // 关闭弹窗
      setInvestmentMemoDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      throw err;
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
        <AlertTitle>错误</AlertTitle>
        <AlertDescription>
          {error}
          <div className="mt-4">
            <button
              onClick={fetchData}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重新加载
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
        onAddCompanyInfo={openAddCompanyInfoDialog}
        onAddInvestmentMemo={!assetMeta?.investmentMemo ? () => setInvestmentMemoDialogOpen(true) : undefined}
      />

      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

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
            setMarketInfo(info);
            setActiveTab('latest');
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
    </div>
  );
}