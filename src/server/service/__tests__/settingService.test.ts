import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingService, SettingType } from '../settingService';

// Mock @server/lib/db before importing settingService
vi.mock('@server/lib/db', () => ({
  db: {
    query: {
      settings: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@server/service/authService', () => ({
  AuthService: {
    getCurrentUserId: vi.fn(),
  },
}));

import { db } from '@server/lib/db';
import { AuthService } from '../authService';

const mockSetting: SettingType = {
  id: 1,
  accountId: 1,
  key: 'test_key',
  value: 'test_value',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SettingService', () => {
  let settingService: SettingService;

  beforeEach(() => {
    settingService = new SettingService();
    vi.clearAllMocks();
  });

  describe('getConfigValueByKey', () => {
    it('应该返回设置的值', async () => {
      (AuthService.getCurrentUserId as any).mockResolvedValue('1');
      vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue(mockSetting);

      const result = await settingService.getConfigValueByKey('test_key');

      expect(result).toBe('test_value');
    });

    it('设置不存在时应该返回 process.env 值', async () => {
      (AuthService.getCurrentUserId as any).mockResolvedValue('1');
      vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue(null);

      const result = await settingService.getConfigValueByKey('NODE_ENV');

      expect(result).toBe(process.env.NODE_ENV);
    });
  });

  describe('getSettingsByAccountId', () => {
    it('应该返回账户的所有设置', async () => {
      (db.query.settings.findMany as any).mockResolvedValue([mockSetting]);

      const result = await settingService.getSettingsByAccountId(1);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('test_key');
    });

    it('应该返回空数组当没有设置', async () => {
      (db.query.settings.findMany as any).mockResolvedValue([]);

      const result = await settingService.getSettingsByAccountId(1);

      expect(result).toHaveLength(0);
    });

    it('数据库错误时应该抛出错误', async () => {
      (db.query.settings.findMany as any).mockRejectedValue(new Error('Database error'));

      await expect(settingService.getSettingsByAccountId(1)).rejects.toThrow();
    });
  });

  describe('getSettingByKey', () => {
    it('应该返回指定的设置', async () => {
      (db.query.settings.findFirst as any).mockResolvedValue(mockSetting);

      const result = await settingService.getSettingByKey('1', 'test_key');

      expect(result).not.toBeNull();
      expect(result?.key).toBe('test_key');
      expect(result?.value).toBe('test_value');
    });

    it('设置不存在时应该返回 null', async () => {
      (db.query.settings.findFirst as any).mockResolvedValue(null);

      const result = await settingService.getSettingByKey('1', 'non_existent');

      expect(result).toBeNull();
    });

    it('数据库错误时应该抛出错误', async () => {
      (db.query.settings.findFirst as any).mockRejectedValue(new Error('Database error'));

      await expect(settingService.getSettingByKey('1', 'test_key')).rejects.toThrow();
    });
  });

  describe('setSetting', () => {
    it('应该成功更新现有设置', async () => {
      vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue(mockSetting);

      const updatedSetting = { ...mockSetting, value: 'new_value' };
      const mockReturning = vi.fn().mockResolvedValue([updatedSetting]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });

      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await settingService.setSetting('1', 'test_key', 'new_value');

      expect(result).not.toBeNull();
      expect(result.value).toBe('new_value');
    });

    it('应该成功创建新设置', async () => {
      vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue(null);

      const newSetting = { ...mockSetting, id: 2, key: 'new_key', value: 'new_value' };
      const mockReturning = vi.fn().mockResolvedValue([newSetting]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });

      const result = await settingService.setSetting('1', 'new_key', 'new_value');

      expect(result).not.toBeNull();
      expect(result.key).toBe('new_key');
    });

    it('数据库错误时应该抛出错误', async () => {
      vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue(null);

      const mockValues = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      (db.insert as any).mockReturnValue({ values: mockValues });

      await expect(settingService.setSetting('1', 'test_key', 'value')).rejects.toThrow();
    });
  });

  describe('deleteSetting', () => {
    it('数据库错误时应该抛出错误', async () => {
      const mockWhere = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      await expect(settingService.deleteSetting('1', 'test_key')).rejects.toThrow();
    });
  });

  describe('deleteAllSettings', () => {
    it('数据库错误时应该抛出错误', async () => {
      const mockWhere = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      await expect(settingService.deleteAllSettings('1')).rejects.toThrow();
    });

    it('数据库错误时应该抛出错误', async () => {
      const mockWhere = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      await expect(settingService.deleteAllSettings('1')).rejects.toThrow();
    });
  });

  describe('getModelServiceApiUrl', () => {
    it('应该从设置中返回模型服务 API 地址', async () => {
      (AuthService.getCurrentUserId as any).mockResolvedValue('1');
      vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue({
        ...mockSetting,
        key: 'MODEL_PROVIDER_URL',
        value: 'https://api.example.com',
      });

      const result = await settingService.getModelServiceApiUrl();

      expect(result).toBe('https://api.example.com');
    });

    it('设置不存在时应该返回 process.env 值', async () => {
      (AuthService.getCurrentUserId as any).mockResolvedValue('1');
      vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue(null);
      process.env.MODEL_PROVIDER_URL = 'https://env.example.com';

      const result = await settingService.getModelServiceApiUrl();

      expect(result).toBe('https://env.example.com');
    });

    it('设置和环境变量都不存在时应该返回 null', async () => {
      (AuthService.getCurrentUserId as any).mockResolvedValue('1');
      vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue(null);
      delete process.env.MODEL_PROVIDER_URL;

      const result = await settingService.getModelServiceApiUrl();

      expect(result).toBeNull();
    });
  });
});
