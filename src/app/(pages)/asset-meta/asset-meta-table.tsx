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
import { useTranslation } from 'react-i18next';

/**
 * Render the asset metadata management interface.
 *
 * Displays a searchable table of asset metadata and provides UI for creating, editing,
 * deleting, refreshing prices, and navigating to asset detail pages. Data is loaded
 * from the server on mount and changes are synced to the list after create/update/delete.
 *
 * @returns The React element that contains the full asset metadata table and associated dialogs, controls, and action handlers.
 */
export function AssetMetaTable() {
  const { t } = useTranslation('asset-meta');
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
          throw new Error(t('error.unknown'));
        }
        const data = await response.json();
        setAssetMetas(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.unknown'));
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
    if (!confirm(t('delete.confirm'))) {
      return;
    }

    try {
      const response = await fetch(`/api/asset/meta?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(t('delete.failed'));
      }

      // 从列表中移除已删除的记录
      setAssetMetas(assetMetas.filter((item) => item.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('delete.failed'));
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
            fullName: assetMeta.fullName,
            logoUrl: assetMeta.logoUrl,
            investmentMemo: assetMeta.investmentMemo,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('save.failed'));
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
      alert(err instanceof Error ? err.message : t('save.failed'));
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
    return <div>{t('loading')}</div>;
  }

  if (error) {
    return <div className="text-red-500">{t('error.title')}: {error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Input
            placeholder={t('search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="cursor-pointer"
              onClick={() => {
                const newAssetMeta: AssetMetaType = {
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
                  fullName: null,
                  logoUrl: null,
                  investmentMemo: null,
                };
                setEditingAssetMeta(newAssetMeta);
                setIsEditDialogOpen(true);
              }}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {t('actions.add')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAssetMeta?.id ? t('form.editTitle') : t('form.addTitle')}
              </DialogTitle>
            </DialogHeader>
            {editingAssetMeta && (
              <AssetMetaEditForm
                key={editingAssetMeta.id || 'new'}
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
              <TableHead>{t('table.headers.symbol')}</TableHead>
              <TableHead>{t('table.headers.price')}</TableHead>
              <TableHead>{t('table.headers.assetType')}</TableHead>
              <TableHead>{t('table.headers.currency')}</TableHead>
              <TableHead>{t('table.headers.market')}</TableHead>
              <TableHead>{t('table.headers.source')}</TableHead>
              <TableHead>{t('table.headers.updatedAt')}</TableHead>
              <TableHead className="text-center">{t('table.headers.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssetMetas.map((assetMeta) => (
              <TableRow
                key={assetMeta.id}
                className={
                  assetMeta.market === 'US'
                    ? 'bg-blue-50/50 hover:bg-blue-100/50'
                    : assetMeta.market === 'HK'
                      ? 'bg-purple-50/50 hover:bg-purple-100/50'
                      : assetMeta.market === 'CN'
                        ? 'bg-green-50/50 hover:bg-green-100/50'
                        : ''
                }
              >
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    {assetMeta.logoUrl ? (
                      <div className="w-6 h-6 rounded overflow-hidden border bg-white flex items-center justify-center">
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
                      <div className="w-6 h-6 rounded border bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">-</span>
                      </div>
                    )}
                    &nbsp;&nbsp;{assetMeta.symbol}
                    <span className="ml-2 text-sm text-gray-500">
                      ({assetMeta.chineseName || '-'})
                    </span>
                  </div>
                </TableCell>
                <TableCell>${(assetMeta.priceCents / 100).toFixed(2)}</TableCell>
                <TableCell>{assetMeta.assetType}</TableCell>
                <TableCell>{assetMeta.currency}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assetMeta.market === 'US'
                        ? 'bg-blue-100 text-blue-800'
                        : assetMeta.market === 'HK'
                          ? 'bg-purple-100 text-purple-800'
                          : assetMeta.market === 'CN'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {assetMeta.market === 'US'
                      ? t('form.markets.US')
                      : assetMeta.market === 'HK'
                        ? t('form.markets.HK')
                        : assetMeta.market === 'CN'
                          ? t('form.markets.CN')
                          : assetMeta.market}
                  </span>
                </TableCell>
                <TableCell>{assetMeta.source}</TableCell>
                <TableCell>
                  {assetMeta.updatedAt
                    ? dayjs(assetMeta.updatedAt).format('YYYY-MM-DD HH:mm')
                    : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // 导航到资产市场信息页面
                        router.push(`/asset-meta/${assetMeta.id}`);
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

/**
 * Form used to create or edit an asset's metadata.
 *
 * Renders inputs for symbol, chinese name, price (in cents), asset type, currency, market, data source, and investment notes;
 * includes a refresh button to fetch the latest price and actions to save or cancel.
 *
 * @param assetMeta - Initial values to populate the form; when `null`, an empty form is shown for creating a new asset.
 * @param onSave - Called with the form data (partial `AssetMetaType` with optional `id`) when the form is submitted.
 * @param onCancel - Called when the user cancels editing.
 * @returns The React element for the edit/create asset form.
 */
function AssetMetaEditForm({
  assetMeta,
  onSave,
  onCancel,
}: {
  assetMeta: AssetMetaType | null;
  onSave: (assetMeta: Partial<AssetMetaType> & { id?: number }) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('asset-meta');
  const [formData, setFormData] = useState<Partial<AssetMetaType> & { id?: number }>(
    assetMeta || {},
  );

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
          <label className="text-sm font-medium">{t('form.fields.symbol')}</label>
          <Input
            value={formData.symbol || ''}
            onChange={(e) => handleChange('symbol', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('form.fields.chineseName')}</label>
          <Input
            value={formData.chineseName || ''}
            onChange={(e) => handleChange('chineseName', e.target.value || null)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('form.fields.fullName')}</label>
          <Input
            value={formData.fullName || ''}
            onChange={(e) => handleChange('fullName', e.target.value || null)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('form.fields.logoUrl')}</label>
          <Input
            value={formData.logoUrl || ''}
            onChange={(e) => handleChange('logoUrl', e.target.value || null)}
            placeholder={t('form.placeholders.logoUrl')}
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('form.fields.priceCents')}</label>
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
                  alert(t('error.unknown'));
                  return;
                }

                // 获取市场类型，默认为US
                const market = formData.market || 'US';

                try {
                  const priceInCents = await fetchLatestPrice(formData.symbol, market);
                  if (priceInCents !== null) {
                    handleChange('priceCents', priceInCents);
                  } else {
                    alert(t('error.unknown'));
                  }
                } catch (error) {
                  console.error('获取价格时出错:', error);
                  alert(t('error.unknown'));
                }
              }}
            >
              <RefreshCwIcon className="h-4 w-4" />
              <span className="sr-only">{t('form.buttons.refreshPrice')}</span>
            </Button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">{t('form.fields.assetType')}</label>
          <Select
            value={formData.assetType || 'stock'}
            onValueChange={(value) => handleChange('assetType', value as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stock">{t('form.assetTypes.stock')}</SelectItem>
              <SelectItem value="etf">{t('form.assetTypes.etf')}</SelectItem>
              <SelectItem value="fund">{t('form.assetTypes.fund')}</SelectItem>
              <SelectItem value="crypto">{t('form.assetTypes.crypto')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">{t('form.fields.currency')}</label>
          <Input
            value={formData.currency || 'USD'}
            onChange={(e) => handleChange('currency', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('form.fields.market')}</label>
          <Select
            value={formData.market || 'US'}
            onValueChange={(value) => handleChange('market', value as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US">{t('form.markets.US')}</SelectItem>
              <SelectItem value="CN">{t('form.markets.CN')}</SelectItem>
              <SelectItem value="HK">{t('form.markets.HK')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">{t('form.fields.source')}</label>
          <Input
            value={formData.source || 'finnhub'}
            onChange={(e) => handleChange('source', e.target.value)}
            required
          />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium">{t('form.fields.investmentMemo')}</label>
          <textarea
            className="w-full p-2 border rounded-md"
            rows={3}
            value={formData.investmentMemo || ''}
            onChange={(e) => handleChange('investmentMemo', e.target.value || null)}
            placeholder={t('form.placeholders.investmentMemo')}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('actions.cancel')}
        </Button>
        <Button type="submit">{t('actions.save')}</Button>
      </div>
    </form>
  );
}
