'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { Button } from '@renderer/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { usePositionStore } from '@renderer/store/position/store';
import { Alert as PositionAlert } from '@renderer/store/position/types';

export function AlertBanner() {
  const { alerts, resolveAlert } = usePositionStore();
  const [visibleAlerts, setVisibleAlerts] = useState<PositionAlert[]>([]);

  useEffect(() => {
    // 只显示未解决的高严重性警报
    const unresolvedHighSeverityAlerts = alerts.filter(
      (alert) => !alert.resolved && alert.severity === 'high',
    );
    setVisibleAlerts(unresolvedHighSeverityAlerts);
  }, [alerts]);

  const handleDismiss = (alertId: string) => {
    resolveAlert(alertId);
    setVisibleAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <Alert key={alert.id} variant="destructive" className="relative">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>风险提醒</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0"
            onClick={() => handleDismiss(alert.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}
    </div>
  );
}
