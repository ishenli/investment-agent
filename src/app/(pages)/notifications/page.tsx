'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Trash2, RefreshCw, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Checkbox } from '@renderer/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Skeleton } from '@renderer/components/ui/skeleton';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { get, del, request } from '@/app/lib/request';
import type {
  Notification,
  NotificationListResponseType,
  NotificationTypeValue,
  NotificationPriorityValue,
} from '@/types/notification';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  code: string;
}

const PRIORITY_COLORS: Record<NotificationPriorityValue, string> = {
  low: 'text-muted-foreground',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

const TYPE_ICONS: Record<NotificationTypeValue, string> = {
  report_completed: '📊',
  analysis_completed: '🔍',
  data_refreshed: '🔄',
  system_announcement: '📢',
  trade_executed: '💰',
  price_alert: '📈',
};

export default function NotificationsPage() {
  const { t } = useTranslation('notification');
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [filterType, setFilterType] = useState<NotificationTypeValue | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<NotificationPriorityValue | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailNotification, setDetailNotification] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        isRead: filterRead,
      };
      if (filterType !== 'all') params.type = filterType;
      if (filterPriority !== 'all') params.priority = filterPriority;

      const response = await get<ApiResponse<NotificationListResponseType>>('/api/notifications', { params });

      if (response.success && response.data) {
        setNotifications(response.data.items || []);
        setTotalCount(response.data.totalCount || 0);
        setUnreadCount(response.data.unreadCount || 0);
        setTotalPages(response.data.totalPages || 1);
      } else {
        toast.error(response.message || t('messages.loadFailed'));
      }
    } catch (error) {
      toast.error(t('messages.loadFailed'));
      console.error('[Notifications] Fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filterRead, filterType, filterPriority, t]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => { setSelectedIds(new Set()); }, [filterRead, filterType, filterPriority, currentPage]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(notifications.map((n) => n.id)) : new Set());
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const next = new Set(selectedIds);
    checked ? next.add(id) : next.delete(id);
    setSelectedIds(next);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await request(`/api/notifications/${id}/read`, { method: 'PATCH' });
      await fetchNotifications();
      toast.success(t('messages.markReadSuccess'));
    } catch { toast.error(t('messages.operationFailed')); }
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => request(`/api/notifications/${id}/read`, { method: 'PATCH' })));
      toast.success(t('messages.batchMarkReadSuccess', { count: selectedIds.size }));
      await fetchNotifications();
    } catch { toast.error(t('messages.batchFailed')); }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('actions.confirmDelete', { count: selectedIds.size }))) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => del(`/api/notifications/${id}`)));
      toast.success(t('messages.deleteSuccess', { count: selectedIds.size }));
      await fetchNotifications();
    } catch { toast.error(t('messages.deleteFailed')); }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await request('/api/notifications/read-all', { method: 'POST' });
      toast.success(t('messages.markAllReadSuccess'));
      await fetchNotifications();
    } catch { toast.error(t('messages.operationFailed')); }
  };

  const parseNotificationData = (data?: string): Record<string, unknown> | null => {
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) handleMarkAsRead(notification.id);
    setDetailNotification(notification);
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
    return d.toLocaleDateString();
  };

  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length;

  return (
    <div className="flex-1 flex flex-col gap-4 p-6">
      {/* Header + Filters — single compact bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              {unreadCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterRead} onValueChange={(v) => { setFilterRead(v as typeof filterRead); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.all')}</SelectItem>
              <SelectItem value="unread">{t('filter.unread')}</SelectItem>
              <SelectItem value="read">{t('filter.read')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(v) => { setFilterType(v as typeof filterType); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.allTypes')}</SelectItem>
              <SelectItem value="price_alert">{t('type.price_alert')}</SelectItem>
              <SelectItem value="trade_executed">{t('type.trade_executed')}</SelectItem>
              <SelectItem value="report_completed">{t('type.report_completed')}</SelectItem>
              <SelectItem value="analysis_completed">{t('type.analysis_completed')}</SelectItem>
              <SelectItem value="data_refreshed">{t('type.data_refreshed')}</SelectItem>
              <SelectItem value="system_announcement">{t('type.system_announcement')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v as typeof filterPriority); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.allPriority')}</SelectItem>
              <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
              <SelectItem value="high">{t('priority.high')}</SelectItem>
              <SelectItem value="medium">{t('priority.medium')}</SelectItem>
              <SelectItem value="low">{t('priority.low')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-5 bg-border mx-1" />

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchNotifications} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMarkAllAsRead} disabled={unreadCount === 0} title={t('markAllRead')}>
            <CheckCheck className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Batch actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {t('actions.selected', { count: selectedIds.size })}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkSelectedAsRead}>
              <Check className="h-3.5 w-3.5 mr-1" />
              {t('actions.markRead')}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleDeleteSelected}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {t('actions.delete')}
            </Button>
          </div>
        </div>
      )}

      {/* Notification List */}
      <Card className="flex-1">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">{t('empty.title')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Select all header */}
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 text-xs text-muted-foreground">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className="h-3.5 w-3.5"
                />
                <span>{t('actions.selectAll')}</span>
                <span className="ml-auto">{t('actions.totalNotifications', { count: totalCount })}</span>
              </div>

              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.isRead ? 'bg-primary/[0.03]' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(notification.id)}
                      onCheckedChange={(checked) => handleSelectOne(notification.id, !!checked)}
                      className="h-3.5 w-3.5"
                    />
                  </div>

                  <span className="text-base pt-px leading-none">{TYPE_ICONS[notification.type]}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {!notification.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                      <span className={`text-sm truncate ${!notification.isRead ? 'font-medium' : ''}`}>
                        {notification.title}
                      </span>
                      <span className={`text-[11px] shrink-0 ${PRIORITY_COLORS[notification.priority]}`}>
                        {notification.priority !== 'low' && `• ${t(`priority.${notification.priority}`)}`}
                      </span>
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {notification.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(notification.createdAt)}
                    </span>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground">
              <span>
                {t('pagination.page', { current: currentPage, total: totalPages, count: totalCount })}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                  {t('pagination.prev')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isLoading}
                >
                  {t('pagination.next')}
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailNotification} onOpenChange={(open) => { if (!open) setDetailNotification(null); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[80vh] flex flex-col">
          {detailNotification && (() => {
            const data = parseNotificationData(detailNotification.data);
            const fullContent = data?.fullContent as string | undefined;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TYPE_ICONS[detailNotification.type]}</span>
                    <DialogTitle className="text-base">{detailNotification.title}</DialogTitle>
                    <Badge variant="secondary" className="text-[11px] ml-auto">
                      {t(`type.${detailNotification.type}`)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <span>{formatDate(detailNotification.createdAt)}</span>
                    <span className={PRIORITY_COLORS[detailNotification.priority]}>
                      {t(`priority.${detailNotification.priority}`)}
                    </span>
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 py-2">
                  {fullContent ? (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {fullContent}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {detailNotification.message}
                    </p>
                  )}
                </div>

                {detailNotification.link && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        router.push(detailNotification.link!);
                        setDetailNotification(null);
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      {t('detail.goToLink')}
                    </Button>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
