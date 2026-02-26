import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingService, SettingType } from '../settingService';

// Mock @server/repository/settingRepository before importing settingService
vi.mock('@server/repository/settingRepository', () => ({
  settingRepository: {
    findByUserId: vi.fn(),
    findByUserIdAndKey: vi.fn(),
    upsert: vi.fn(),
    deleteByUserIdAndKey: vi.fn(),
    deleteByUserId: vi.fn(),
  },
}));

vi.mock('@server/service/authService', () => ({
  default: {
    getCurrentUserId: vi.fn(),
  },
}));

import { settingRepository } from '../../repository/settingRepository';
import authService from '../authService';

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
      (authService.getCurrentUserId as any).mockResolvedValue('1');
      (settingRepository.findByUserIdAndKey as any).mockResolvedValue(mockSetting);

      const result = await settingService.getConfigValueByKey('test_key');

      expect(result).toBe('test_value');
    });

    it('设置不存在时应该返回 process.env 值', async () => {
      (authService.getCurrentUserId as any).mockResolvedValue('1');
      (settingRepository.findByUserIdAndKey as any).mockResolvedValue(null);

      const result = await settingService.getConfigValueByKey('NODE_ENV');

      expect(result).toBe(process.env.NODE_ENV);
    });
  });

  describe('getSettingsByAccountId', () => {
    it('应该返回账户的所有设置', async () => {
      (settingRepository.findByUserId as any).mockResolvedValue([mockSetting]);

      const result = await settingService.getSettingsByAccountId(1);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('test_key');
    });

    it('应该返回空数组当没有设置', async () => {
      (settingRepository.findByUserId as any).mockResolvedValue([]);

      const result = await settingService.getSettingsByAccountId(1);

      expect(result).toHaveLength(0);
    });

    it('数据库错误时应该抛出错误', async () => {
      (settingRepository.findByUserId as any).mockRejectedValue(new Error('Database error'));

      await expect(settingService.getSettingsByAccountId(1)).rejects.toThrow();
    });
  });

  describe('getSettingByKey', () => {
    it('应该返回指定的设置', async () => {
      (settingRepository.findByUserIdAndKey as any).mockResolvedValue(mockSetting);

      const result = await settingService.getSettingByKey('1', 'test_key');

      expect(result).not.toBeNull();
      expect(result?.key).toBe('test_key');
      expect(result?.value).toBe('test_value');
    });

    it('设置不存在时应该返回 null', async () => {
      (settingRepository.findByUserIdAndKey as any).mockResolvedValue(null);

      const result = await settingService.getSettingByKey('1', 'non_existent');

      expect(result).toBeNull();
    });

    it('数据库错误时应该抛出错误', async () => {
      (settingRepository.findByUserIdAndKey as any).mockRejectedValue(new Error('Database error'));

      await expect(settingService.getSettingByKey('1', 'test_key')).rejects.toThrow();
    });
  });

  describe('setSetting', () => {
    it('应该成功更新现有设置', async () => {
      (settingRepository.upsert as any).mockResolvedValue({ ...mockSetting, value: 'new_value' });

      const result = await settingService.setSetting('1', 'test_key', 'new_value');

      expect(result).not.toBeNull();
      expect(result.value).toBe('new_value');
    });

    it('应该成功创建新设置', async () => {
      (settingRepository.upsert as any).mockResolvedValue({ ...mockSetting, id: 2, key: 'new_key', value: 'new_value' });

      const result = await settingService.setSetting('1', 'new_key', 'new_value');

      expect(result).not.toBeNull();
      expect(result.key).toBe('new_key');
    });

    it('数据库错误时应该抛出错误', async () => {
      (settingRepository.upsert as any).mockRejectedValue(new Error('Database error'));

      await expect(settingService.setSetting('1', 'test_key', 'value')).rejects.toThrow();
    });
  });

  describe('deleteSetting', () => {
    it('应该成功删除设置', async () => {
      (settingRepository.deleteByUserIdAndKey as any).mockResolvedValue(true);

      const result = await settingService.deleteSetting('1', 'test_key');

      expect(result).toBe(true);
    });

    it('数据库错误时应该抛出错误', async () => {
      (settingRepository.deleteByUserIdAndKey as any).mockRejectedValue(new Error('Database error'));

      await expect(settingService.deleteSetting('1', 'test_key')).rejects.toThrow();
    });
  });

  describe('deleteAllSettings', () => {
    it('应该成功删除所有设置', async () => {
      (settingRepository.deleteByUserId as any).mockResolvedValue();

      const result = await settingService.deleteAllSettings('1');

      expect(result).toBe(true);
    });

    it('数据库错误时应该抛出错误', async () => {
      (settingRepository.deleteByUserId as any).mockRejectedValue(new Error('Database error'));

      await expect(settingService.deleteAllSettings('1')).rejects.toThrow();
    });
  });

  describe('getModelServiceApiUrl', () => {
    it('应该从设置中返回模型服务 API 地址', async () => {
      (authService.getCurrentUserId as any).mockResolvedValue('1');
      (settingRepository.findByUserIdAndKey as any).mockResolvedValue({
        ...mockSetting,
        key: 'MODEL_PROVIDER_URL',
        value: 'https://api.example.com',
      });

      const result = await settingService.getModelServiceApiUrl();

      expect(result).toBe('https://api.example.com');
    });

    it('设置不存在时应该返回 process.env 值', async () => {
      (authService.getCurrentUserId as any).mockResolvedValue('1');
      (settingRepository.findByUserIdAndKey as any).mockResolvedValue(null);
      process.env.MODEL_PROVIDER_URL = 'https://env.example.com';

      const result = await settingService.getModelServiceApiUrl();

      expect(result).toBe('https://env.example.com');
    });

    it('设置和环境变量都不存在时应该返回 null', async () => {
      (authService.getCurrentUserId as any).mockResolvedValue('1');
      (settingRepository.findByUserIdAndKey as any).mockResolvedValue(null);
      delete process.env.MODEL_PROVIDER_URL;

      const result = await settingService.getModelServiceApiUrl();

      expect(result).toBeNull();
    });
  });
});
