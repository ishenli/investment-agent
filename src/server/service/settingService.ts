import { settingRepository, type Setting } from '@server/repository/settingRepository';
import logger from '@server/base/logger';
import authService from './authService';

export type SettingType = Setting;

export class SettingService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  async getConfigValueByKey(key: string): Promise<string | undefined> {
    const userId = await authService.getCurrentUserId();
    const setting = await settingRepository.findByUserIdAndKey(parseInt(userId), key);
    if (setting) {
      return setting.value;
    }
    return process.env[key];
  }

  /**
   * 获取账户的所有设置
   * @param userId 用户ID
   * @returns 设置列表
   */
  async getSettingsByAccountId(userId: number): Promise<SettingType[]> {
    try {
      return await settingRepository.findByUserId(userId);
    } catch (error) {
      logger.error(`Failed to get settings for user ${userId}: ${error}`);
      throw new Error(`Database query failed: ${error}`);
    }
  }

  /**
   * 根据用户ID和键获取特定设置
   * @param userId 用户ID
   * @param key 设置键
   * @returns 设置值或null
   */
  async getSettingByKey(userId: string, key: string): Promise<SettingType | null> {
    try {
      return await settingRepository.findByUserIdAndKey(parseInt(userId), key);
    } catch (error) {
      logger.error(`Failed to get setting ${key} for user ${userId}: ${error}`);
      throw new Error(`Database query failed: ${error}`);
    }
  }

  /**
   * 创建或更新账户设置
   * @param userId 用户ID
   * @param key 设置键
   * @param value 设置值
   * @returns 创建或更新的设置
   */
  async setSetting(userId: string, key: string, value: string): Promise<SettingType> {
    try {
      return await settingRepository.upsert(parseInt(userId), key, value);
    } catch (error) {
      logger.error(`Failed to set setting ${key} for user ${userId}: ${error}`);
      throw new Error(`Database operation failed: ${error}`);
    }
  }

  /**
   * 删除账户的特定设置
   * @param userId 用户ID
   * @param key 设置键
   * @returns 删除是否成功
   */
  async deleteSetting(userId: string, key: string): Promise<boolean> {
    try {
      return await settingRepository.deleteByUserIdAndKey(parseInt(userId), key);
    } catch (error) {
      logger.error(`Failed to delete setting ${key} for user ${userId}: ${error}`);
      throw new Error(`Database delete failed: ${error}`);
    }
  }

  /**
   * 删除账户的所有设置
   * @param userId 用户ID
   * @returns 删除是否成功
   */
  async deleteAllSettings(userId: string): Promise<boolean> {
    try {
      await settingRepository.deleteByUserId(parseInt(userId));
      return true;
    } catch (error) {
      logger.error(`Failed to delete all settings for user ${userId}: ${error}`);
      throw new Error(`Database delete failed: ${error}`);
    }
  }

  // 获取模型服务 API 地址
  async getModelServiceApiUrl(): Promise<string | null> {
    const userId = await authService.getCurrentUserId();
    const setting = await settingRepository.findByUserIdAndKey(parseInt(userId), 'MODEL_PROVIDER_URL');
    return setting ? setting.value : process.env.MODEL_PROVIDER_URL || null;
  }
}

const settingService = new SettingService();

export default settingService;
