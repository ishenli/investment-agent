'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@renderer/components/ui/dialog';
import { PlusIcon, PencilIcon, TrashIcon, RefreshCwIcon, EyeIcon } from 'lucide-react';
import { AssetMetaType } from '@/types/assetMeta';
import dayjs from 'dayjs';
import { fetchLatestPrice } from '@renderer/services/assetService';
import { useRouter } from 'next/navigation';

export function AssetMetaTable() {
  const [assetMetas, setAssetMetas] = useState<AssetMetaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAssetMeta, setEditingAssetMeta] = useState<AssetMetaType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  // 获取 assetMeta 数据
  useEffect(() => {
    const fetchAssetMetas = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/asset/meta');
        if (!response.ok) {
          throw new Error('获取数据失败');
        }
        const data = await response.json();
        setAssetMetas(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchAssetMetas();
  }, []);

  // 处理编辑
  const handleEdit = (assetMeta: AssetMetaType) => {
    setEditingAssetMeta(assetMeta);
    setIsEditDialogOpen(true);
  };

  // 处理删除
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/asset/meta?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      // 从列表中移除已删除的记录
      setAssetMetas(assetMetas.filter((item) => item.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 处理保存
  const handleSave = async (assetMeta: Partial<AssetMetaType> & { id?: number }) => {
    try {
      let response;
      if (assetMeta.id) {
        // 更新现有记录
        response = await fetch('/api/asset/meta', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assetMeta),
        });
      } else {
        // 创建新记录
        response = await fetch('/api/asset/meta', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: assetMeta.symbol,
            priceCents: assetMeta.priceCents,
            assetType: assetMeta.assetType,
            currency: assetMeta.currency,
            createdAt: assetMeta.createdAt,
            source: assetMeta.source,
            market: assetMeta.market,
            chineseName: assetMeta.chineseName,
            investmentMemo: assetMeta.investmentMemo,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '保存失败');
      }

      const result = await response.json();

      if (assetMeta.id) {
        // 更新现有记录
        setAssetMetas(assetMetas.map((item) => (item.id === assetMeta.id ? result.data : item)));
      } else {
        // 添加新记录
        setAssetMetas([...assetMetas, result.data]);
      }

      setIsEditDialogOpen(false);
      setEditingAssetMeta(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    }
  };

  // 过滤数据
  const filteredAssetMetas = assetMetas.filter(
    (assetMeta) =>
      assetMeta.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (assetMeta.chineseName &&
        assetMeta.chineseName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (assetMeta.investmentMemo &&
        assetMeta.investmentMemo.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  if (loading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div className="text-red-500">错误: {error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Input
            placeholder="搜索股票代码、中文名称或投资笔记..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingAssetMeta({
                  id: 0,
                  symbol: '',
                  priceCents: 0,
                  assetType: 'stock',
                  currency: 'USD',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  source: 'finnhub',
                  market: 'US',
                  chineseName: null,
                  investmentMemo: null,
                });
                setIsEditDialogOpen(true);
              }}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              添加新资产
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAssetMeta?.id ? '编辑资产元数据' : '添加资产元数据'}
              </DialogTitle>
            </DialogHeader>
            {editingAssetMeta && (
              <AssetMetaEditForm
                assetMeta={editingAssetMeta}
                onSave={handleSave}
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setEditingAssetMeta(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>股票代码</TableHead>
              <TableHead>价格 (USD)</TableHead>
              <TableHead>资产类型</TableHead>
              <TableHead>货币</TableHead>
              <TableHead>市场</TableHead>
              <TableHead>数据来源</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssetMetas.map((assetMeta) => (
              <TableRow key={assetMeta.id}>
                <TableCell className="font-medium">{assetMeta.symbol}<span className="ml-2 text-sm text-gray-500">({assetMeta.chineseName || '-'})</span></TableCell>
                <TableCell>${(assetMeta.priceCents / 100).toFixed(2)}</TableCell>
                <TableCell>{assetMeta.assetType}</TableCell>
                <TableCell>{assetMeta.currency}</TableCell>
                <TableCell>{assetMeta.market}</TableCell>
                <TableCell>{assetMeta.source}</TableCell>
                <TableCell>{assetMeta.updatedAt ? dayjs(assetMeta.updatedAt).format('YYYY-MM-DD HH:mm') : '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // 导航到资产市场信息页面
                        router.push(`/asset-market-info/${assetMeta.id}`);
                      }}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(assetMeta)}>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(assetMeta.id)}>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// 编辑表单组件
function AssetMetaEditForm({
  assetMeta,
  onSave,
  onCancel,
}: {
  assetMeta: AssetMetaType | null;
  onSave: (assetMeta: Partial<AssetMetaType> & { id?: number }) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<AssetMetaType> & { id?: number }>(
    assetMeta || {},
  );

  useEffect(() => {
    setFormData(assetMeta || {});
  }, [assetMeta]);

  const handleChange = (field: keyof AssetMetaType, value: string | number | Date | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">股票代码 *</label>
          <Input
            value={formData.symbol || ''}
            onChange={(e) => handleChange('symbol', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">中文名称</label>
          <Input
            value={formData.chineseName || ''}
            onChange={(e) => handleChange('chineseName', e.target.value || null)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">价格 (美分) *</label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={formData.priceCents || 0}
              onChange={(e) => handleChange('priceCents', parseInt(e.target.value) || 0)}
              required
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={async () => {
                if (!formData.symbol) {
                  alert('请先输入股票代码');
                  return;
                }

                // 获取市场类型，默认为US
                const market = formData.market || 'US';

                try {
                  const priceInCents = await fetchLatestPrice(formData.symbol, market);
                  if (priceInCents !== null) {
                    handleChange('priceCents', priceInCents);
                  } else {
                    alert('无法获取价格，请检查股票代码和市场');
                  }
                } catch (error) {
                  console.error('获取价格时出错:', error);
                  alert('获取价格时出错');
                }
              }}
            >
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">资产类型 *</label>
          <Select
            value={formData.assetType || 'stock'}
            onValueChange={(value) => handleChange('assetType', value as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stock">股票</SelectItem>
              <SelectItem value="etf">ETF</SelectItem>
              <SelectItem value="fund">基金</SelectItem>
              <SelectItem value="crypto">加密货币</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">货币 *</label>
          <Input
            value={formData.currency || 'USD'}
            onChange={(e) => handleChange('currency', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">市场 *</label>
          <Select
            value={formData.market || 'US'}
            onValueChange={(value) => handleChange('market', value as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US">美股</SelectItem>
              <SelectItem value="CN">A股</SelectItem>
              <SelectItem value="HK">港股</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">数据来源 *</label>
          <Input
            value={formData.source || 'finnhub'}
            onChange={(e) => handleChange('source', e.target.value)}
            required
          />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium">投资笔记</label>
          <textarea
            className="w-full p-2 border rounded-md"
            rows={3}
            value={formData.investmentMemo || ''}
            onChange={(e) => handleChange('investmentMemo', e.target.value || null)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">保存</Button>
      </div>
    </form>
  );
}
