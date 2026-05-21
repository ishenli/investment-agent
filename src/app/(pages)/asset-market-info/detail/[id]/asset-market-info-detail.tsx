'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { AlertCircle, RefreshCw, ArrowLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@renderer/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Textarea } from '@renderer/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AssetMarketInfoType } from '@/types/marketInfo';
import { useTranslation } from 'react-i18next';

type EditForm = {
  title: string;
  sentiment: string;
  importance: string;
  summary: string;
  marketImpact: string;
  keyTopics: string;
  keyDataPoints: string;
  sourceUrl: string;
  sourceName: string;
};

export function AssetMarketInfoDetail({ marketInfoId }: { marketInfoId: number }) {
  const { t } = useTranslation('asset-market-info');
  const router = useRouter();
  const [marketInfo, setMarketInfo] = useState<AssetMarketInfoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 删除弹窗状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 编辑弹窗状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: '',
    sentiment: '',
    importance: '',
    summary: '',
    marketImpact: '',
    keyTopics: '',
    keyDataPoints: '',
    sourceUrl: '',
    sourceName: '',
  });

  const fetchMarketInfoDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/asset/market-info/detail?id=${marketInfoId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('error.fetchDetailFailed'));
      }

      const result = await response.json();
      setMarketInfo(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketInfoDetail();
  }, [marketInfoId]);

  const openEditDialog = () => {
    if (!marketInfo) return;
    setEditForm({
      title: marketInfo.title,
      sentiment: marketInfo.sentiment,
      importance: marketInfo.importance,
      summary: marketInfo.summary,
      marketImpact: marketInfo.marketImpact,
      keyTopics: marketInfo.keyTopics ?? '',
      keyDataPoints: marketInfo.keyDataPoints ?? '',
      sourceUrl: marketInfo.sourceUrl ?? '',
      sourceName: marketInfo.sourceName ?? '',
    });
    setSaveError(null);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);

      const response = await fetch('/api/asset/market-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: marketInfoId,
          title: editForm.title,
          sentiment: editForm.sentiment,
          importance: editForm.importance,
          summary: editForm.summary,
          marketImpact: editForm.marketImpact,
          keyTopics: editForm.keyTopics || null,
          keyDataPoints: editForm.keyDataPoints || null,
          sourceUrl: editForm.sourceUrl || null,
          sourceName: editForm.sourceName || null,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || t('error.saveFailed'));
      }

      setMarketInfo(result.data.data);
      setEditDialogOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('error.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/asset/market-info?id=${marketInfoId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || t('error.deleteFailed'));
      }

      router.push('/asset-market-info');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.deleteFailed'));
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

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

  if (loading) {
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
            <Button onClick={fetchMarketInfoDetail} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('error.reload')}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!marketInfo) {
    return (
      <Alert>
        <AlertTitle>{t('detail.noData.title')}</AlertTitle>
        <AlertDescription>{t('detail.noData.description')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 + 编辑按钮 */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" asChild>
          <Link href="/asset-market-info">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('detail.backToList')}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={openEditDialog}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('detail.edit')}
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('detail.delete')}
          </Button>
        </div>
      </div>

      {/* 标题区域 */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{marketInfo.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={getSentimentColor(marketInfo.sentiment)}>
            {t('detail.sentiment')}: {t(`sentiment.${marketInfo.sentiment}`, { defaultValue: marketInfo.sentiment })}
          </Badge>
          <Badge variant="outline" className={getImportanceColor(marketInfo.importance)}>
            {t('detail.importanceLabel')}: {marketInfo.importance}/10
          </Badge>
          <span className="text-muted-foreground text-sm">
            {t('detail.publishedAt')}: {format(new Date(marketInfo.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
          </span>
        </div>
      </div>

      {/* 关联资产 */}
      {marketInfo.assetMetas && marketInfo.assetMetas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('detail.sections.relatedAssets')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {marketInfo.assetMetas.map((asset) => (
                <Link key={asset.id} href={`/asset-meta/${asset.id}`}>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    {asset.chineseName || asset.symbol}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 摘要 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('detail.sections.summary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">{marketInfo.summary}</p>
        </CardContent>
      </Card>

      {/* 市场影响 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('detail.sections.marketImpact')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">{marketInfo.marketImpact}</p>
        </CardContent>
      </Card>

      {/* 关键话题 */}
      {marketInfo.keyTopics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('detail.sections.keyTopics')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{marketInfo.keyTopics}</p>
          </CardContent>
        </Card>
      )}

      {/* 关键数据点 */}
      {marketInfo.keyDataPoints && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('detail.sections.keyDataPoints')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{marketInfo.keyDataPoints}</p>
          </CardContent>
        </Card>
      )}

      {/* 原始内容（原文保留模式） */}
      {marketInfo.originalContent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('detail.sections.originalContent')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{marketInfo.originalContent}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 来源信息 */}
      {(marketInfo.sourceName || marketInfo.sourceUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('detail.sections.source')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {marketInfo.sourceName && (
              <p className="text-sm">
                <span className="font-medium">{t('detail.sections.sourceName')}:</span> {marketInfo.sourceName}
              </p>
            )}
            {marketInfo.sourceUrl && (
              <p className="text-sm">
                <span className="font-medium">{t('detail.sections.sourceUrl')}:</span>{' '}
                <a
                  href={marketInfo.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {marketInfo.sourceUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 元信息 */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>ID: {marketInfo.id}</span>
            <span>
              {t('detail.contentMode')}: {marketInfo.contentMode === 'ai_summary' ? t('detail.contentModeAI') : t('detail.contentModeOriginal')}
            </span>
            <span>
              {t('detail.updatedAt')}: {format(new Date(marketInfo.updatedAt), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('detail.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('detail.deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t('detail.deleteConfirm.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? t('detail.deleteConfirm.deleting') : t('detail.deleteConfirm.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('edit.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {saveError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-title">{t('edit.fields.title')}</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sentiment">{t('edit.fields.sentiment')}</Label>
                <Select
                  key={editForm.sentiment + String(editDialogOpen)}
                  defaultValue={editForm.sentiment}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, sentiment: v }))}
                >
                  <SelectTrigger id="edit-sentiment">
                    <SelectValue placeholder={t('edit.fields.sentimentPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">{t('sentiment.positive')}</SelectItem>
                    <SelectItem value="neutral">{t('sentiment.neutral')}</SelectItem>
                    <SelectItem value="negative">{t('sentiment.negative')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-importance">{t('edit.fields.importance')}</Label>
                <Input
                  id="edit-importance"
                  type="number"
                  min={1}
                  max={10}
                  value={editForm.importance}
                  onChange={(e) => setEditForm((p) => ({ ...p, importance: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-summary">{t('edit.fields.summary')}</Label>
              <Textarea
                id="edit-summary"
                rows={4}
                value={editForm.summary}
                onChange={(e) => setEditForm((p) => ({ ...p, summary: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-market-impact">{t('edit.fields.marketImpact')}</Label>
              <Textarea
                id="edit-market-impact"
                rows={3}
                value={editForm.marketImpact}
                onChange={(e) => setEditForm((p) => ({ ...p, marketImpact: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-key-topics">{t('edit.fields.keyTopics')}</Label>
              <Textarea
                id="edit-key-topics"
                rows={2}
                value={editForm.keyTopics}
                onChange={(e) => setEditForm((p) => ({ ...p, keyTopics: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-key-data-points">{t('edit.fields.keyDataPoints')}</Label>
              <Textarea
                id="edit-key-data-points"
                rows={2}
                value={editForm.keyDataPoints}
                onChange={(e) => setEditForm((p) => ({ ...p, keyDataPoints: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-source-name">{t('edit.fields.sourceName')}</Label>
                <Input
                  id="edit-source-name"
                  value={editForm.sourceName}
                  onChange={(e) => setEditForm((p) => ({ ...p, sourceName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-source-url">{t('edit.fields.sourceUrl')}</Label>
                <Input
                  id="edit-source-url"
                  value={editForm.sourceUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, sourceUrl: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              {t('edit.buttons.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('edit.buttons.saving') : t('edit.buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

