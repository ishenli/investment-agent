'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Filter, Archive, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Switch } from '@renderer/components/ui/switch';
import { Label } from '@renderer/components/ui/label';
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

// API 响应包装类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  code: string;
}

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

  // Filters
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [filterType, setFilterType] = useState<NotificationTypeValue | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<NotificationPriorityValue | 'all'>('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        isRead: filterRead,
      };
      if (filterType !== 'all') {
        params.type = filterType;
      }
      if (filterPriority !== 'all') {
        params.priority = filterPriority;
      }

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

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filterRead, filterType, filterPriority, currentPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(notifications.map((n: Notification) => n.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await request(`/api/notifications/${id}/read`, { method: 'PATCH' });
      await fetchNotifications();
      toast.success(t('messages.markReadSuccess'));
    } catch (error) {
      toast.error(t('messages.operationFailed'));
    }
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          request(`/api/notifications/${id}/read`, { method: 'PATCH' })
        )
      );
      toast.success(t('messages.batchMarkReadSuccess', { count: selectedIds.size }));
      await fetchNotifications();
    } catch (error) {
      toast.error(t('messages.batchFailed'));
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          del(`/api/notifications/${id}`)
        )
      );
      toast.success(t('messages.archiveSuccess', { count: selectedIds.size }));
      await fetchNotifications();
    } catch (error) {
      toast.error(t('messages.archiveFailed'));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('actions.confirmDelete', { count: selectedIds.size }))) return;
    
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          del(`/api/notifications/${id}`)
        )
      );
      toast.success(t('messages.deleteSuccess', { count: selectedIds.size }));
      await fetchNotifications();
    } catch (error) {
      toast.error(t('messages.deleteFailed'));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await request('/api/notifications/read-all', { method: 'POST' });
      toast.success(t('messages.markAllReadSuccess'));
      await fetchNotifications();
    } catch (error) {
      toast.error(t('messages.operationFailed'));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    // Navigate to link if available
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
    return d.toLocaleDateString();
  };

  const getTypeLabel = (type: NotificationTypeValue) => {
    return t(`type.${type}`);
  };

  const getPriorityLabel = (priority: NotificationPriorityValue) => {
    return t(`priority.${priority}`);
  };

  const PRIORITY_COLORS: Record<NotificationPriorityValue, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  };

  const TYPE_ICONS: Record<NotificationTypeValue, string> = {
    report_completed: '📊',
    analysis_completed: '🔍',
    data_refreshed: '🔄',
    system_announcement: '📢',
    trade_executed: '💰',
    price_alert: '📈',
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? t('unreadCount', { count: unreadCount }) : t('noUnread')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            {t('markAllRead')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">{t('filter.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>{t('filter.status')}</Label>
              <Select value={filterRead} onValueChange={(v) => setFilterRead(v as typeof filterRead)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter.all')}</SelectItem>
                  <SelectItem value="unread">{t('filter.unread')}</SelectItem>
                  <SelectItem value="read">{t('filter.read')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('filter.type')}</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger className="w-36">
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
            </div>

            <div className="space-y-2">
              <Label>{t('filter.priority')}</Label>
              <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as typeof filterPriority)}>
                <SelectTrigger className="w-28">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {t('actions.selected', { count: selectedIds.size })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkSelectedAsRead}>
              <Check className="h-4 w-4 mr-2" />
              {t('actions.markRead')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleArchiveSelected}>
              <Archive className="h-4 w-4 mr-2" />
              {t('actions.archive')}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4 mr-2" />
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
                <div key={i} className="flex items-start gap-4 p-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p>{t('empty.title')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Select All */}
              <div className="flex items-center gap-4 p-4 bg-muted/30">
                <Switch
                  checked={selectedIds.size === notifications.length && notifications.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {t('actions.selectAll')} ({t('actions.totalNotifications', { count: totalCount })})
                </span>
              </div>

              {/* Notifications */}
              {notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={selectedIds.has(notification.id)}
                      onCheckedChange={(checked) => handleSelectOne(notification.id, checked)}
                    />
                  </div>
                  
                  <div className="text-2xl">
                    {TYPE_ICONS[notification.type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${!notification.isRead ? 'text-primary' : ''}`}>
                        {notification.title}
                      </span>
                      {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(notification.type)}
                      </Badge>
                      <Badge className={`text-xs ${PRIORITY_COLORS[notification.priority]}`}>
                        {getPriorityLabel(notification.priority)}
                      </Badge>
                    </div>
                    {notification.message && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>

                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                {t('pagination.page', { current: currentPage, total: totalPages, count: totalCount })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('pagination.prev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isLoading}
                >
                  {t('pagination.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
