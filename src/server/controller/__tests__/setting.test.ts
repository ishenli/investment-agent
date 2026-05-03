import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingBizController } from '../setting';
import settingService from '../../service/settingService';
import authService from '../../service/authService';

vi.mock('@server/base/decorators', () => ({
  WithRequestContext:
    () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      descriptor.value = async function (this: any, ...args: any[]) {
        return await originalMethod.apply(this, args);
      };
      return descriptor;
    },
}));

describe('SettingBizController - Notification Preferences', () => {
  let controller: SettingBizController;

  beforeEach(() => {
    controller = new SettingBizController();
    vi.clearAllMocks();
  });

  describe('getNotificationPreferences', () => {
    it('已登录用户应该返回通知偏好设置', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue({
        id: 1,
        userId: 1,
        key: 'NOTIFICATION_PREFERENCES',
        value: JSON.stringify({ osNotificationsEnabled: false, soundEnabled: true, types: { price_alert: true } }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await controller.getNotificationPreferences();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        osNotificationsEnabled: false,
        soundEnabled: true,
        types: { price_alert: true },
      });
    });

    it('没有保存过偏好时返回默认值', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue(null);

      const result = await controller.getNotificationPreferences();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        osNotificationsEnabled: true,
        soundEnabled: false,
        types: {},
      });
    });

    it('JSON 解析失败时返回默认值', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue({
        id: 1,
        userId: 1,
        key: 'NOTIFICATION_PREFERENCES',
        value: 'invalid-json',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await controller.getNotificationPreferences();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        osNotificationsEnabled: true,
        soundEnabled: false,
        types: {},
      });
    });

    it('未登录用户返回认证错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue(null);

      const result = await controller.getNotificationPreferences();

      expect(result.success).toBe(false);
      expect(result.code).toBe('unauthorized');
    });
  });

  describe('updateNotificationPreferences', () => {
    it('已登录用户应该成功更新偏好', async () => {
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue({ id: 1 } as any);
      vi.spyOn(settingService, 'setSetting').mockResolvedValue({} as any);

      const preferences = {
        osNotificationsEnabled: false,
        soundEnabled: true,
        types: { price_alert: false },
      };

      const result = await controller.updateNotificationPreferences(preferences);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(preferences);
      expect(settingService.setSetting).toHaveBeenCalledWith(
        '1',
        'NOTIFICATION_PREFERENCES',
        JSON.stringify(preferences)
      );
    });

    it('未登录用户返回认证错误', async () => {
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(null);

      const result = await controller.updateNotificationPreferences({
        osNotificationsEnabled: true,
        soundEnabled: false,
        types: {},
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('unauthorized');
    });
  });
});
