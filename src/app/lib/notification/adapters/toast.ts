import { toast } from 'sonner';
import type { NotificationAdapter, NotificationPayload } from '../types';

export class ToastAdapter implements NotificationAdapter {
  readonly name = 'toast';

  canHandle(): boolean {
    return typeof window !== 'undefined';
  }

  show(payload: NotificationPayload): void {
    const { title, message, type, actions } = payload;

    const description = actions && actions.length > 0
      ? `${message} ${actions.map(a => `[${a.label}]`).join(' ')}`
      : message;

    switch (type) {
      case 'price_alert':
        toast.warning(title, { description });
        break;
      case 'trade_executed':
        toast.success(title, { description });
        break;
      case 'report_completed':
      case 'analysis_completed':
        toast.info(title, { description });
        break;
      case 'system_announcement':
        toast.message(title, { description });
        break;
      case 'data_refreshed':
        toast(title, { description });
        break;
      default:
        toast(title, { description });
        break;
    }
  }

  requestPermission?(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
