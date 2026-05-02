/**
 * Shared IPC channel constants for Electron notification bridge.
 * Used by both preload (renderer) and main process.
 */

export const NotificationChannels = {
  showNativeNotification: 'show-native-notification',
  setBadgeCount: 'set-badge-count',
  clearBadgeCount: 'clear-badge-count',
  notificationClicked: 'notification-clicked',
  markNotificationRead: 'mark-notification-read',
} as const;

export type NotificationChannel = (typeof NotificationChannels)[keyof typeof NotificationChannels];

export interface ShowNativeNotificationOptions {
  title: string;
  body: string;
  link?: string;
  actions?: Array<{ id: string; label: string }>;
}
