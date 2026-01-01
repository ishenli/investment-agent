import { db } from '@server/lib/db';
import { settings } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import logger from '@server/base/logger';
import { AuthService } from './authService';

export type SettingType = {
  id: number;
  accountId: number;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};

export class SettingService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  async getConfigValueByKey(key: string) {
    const accountId = await AuthService.getCurrentUserId() ;
    const value = await this.getSettingByKey(accountId, key);
    if (value) {
      return value.value;
    }
    return process.env[key];
  }

  /**
   * 获取账户的所有设置
   * @param accountId 账户ID
   * @returns 设置列表
   */
  async getSettingsByAccountId(accountId: number): Promise<SettingType[]> {
    try {
      const result = await db.query.settings.findMany({
        where: eq(settings.accountId, accountId),
      });

      return result.map((setting) => ({
        ...setting,
        createdAt: setting.createdAt ? new Date(setting.createdAt) : new Date(),
        updatedAt: setting.updatedAt ? new Date(setting.updatedAt) : new Date(),
      }));
    } catch (error) {
      logger.error(`Failed to get settings for account ${accountId}: ${error}`);
      throw new Error(`Database query failed: ${error}`);
    }
  }

  /**
   * 根据账户ID和键获取特定设置
   * @param accountId 账户ID
   * @param key 设置键
   * @returns 设置值或null
   */
  async getSettingByKey(accountId: string, key: string): Promise<SettingType | null> {
    try {
      const setting = await db.query.settings.findFirst({
        where: and(eq(settings.accountId, parseInt(accountId)), eq(settings.key, key)),
      });

      return setting
        ? {
            ...setting,
            createdAt: setting.createdAt ? new Date(setting.createdAt) : new Date(),
            updatedAt: setting.updatedAt ? new Date(setting.updatedAt) : new Date(),
          }
        : null;
    } catch (error) {
      logger.error(`Failed to get setting ${key} for account ${accountId}: ${error}`);
      throw new Error(`Database query failed: ${error}`);
    }
  }

  /**
   * 创建或更新账户设置
   * @param accountId 账户ID
   * @param key 设置键
   * @param value 设置值
   * @returns 创建或更新的设置
   */
  async setSetting(accountId: string, key: string, value: string): Promise<SettingType> {
    try {
      // 首先检查设置是否已存在
      const existingSetting = await this.getSettingByKey(accountId, key);

      if (existingSetting) {
        // 更新现有设置
        const [updatedSetting] = await db
          .update(settings)
          .set({
            value,
            updatedAt: new Date(),
          })
          .where(and(eq(settings.accountId, parseInt(accountId)), eq(settings.key, key)))
          .returning();

        return {
          ...updatedSetting,
          createdAt: updatedSetting.createdAt ? new Date(updatedSetting.createdAt) : new Date(),
          updatedAt: updatedSetting.updatedAt ? new Date(updatedSetting.updatedAt) : new Date(),
        };
      } else {
        // 创建新设置
        const [newSetting] = await db
          .insert(settings)
          .values({
            accountId: parseInt(accountId),
            key,
            value,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return {
          ...newSetting,
          createdAt: newSetting.createdAt ? new Date(newSetting.createdAt) : new Date(),
          updatedAt: newSetting.updatedAt ? new Date(newSetting.updatedAt) : new Date(),
        };
      }
    } catch (error) {
      logger.error(`Failed to set setting ${key} for account ${accountId}: ${error}`);
      throw new Error(`Database operation failed: ${error}`);
    }
  }

  /**
   * 删除账户的特定设置
   * @param accountId 账户ID
   * @param key 设置键
   * @returns 删除是否成功
   */
  async deleteSetting(accountId: string, key: string): Promise<boolean> {
    try {
      const result = await db
        .delete(settings)
        .where(and(eq(settings.accountId, parseInt(accountId)), eq(settings.key, key)));

      return result.lastInsertRowid === 0;
    } catch (error) {
      logger.error(`Failed to delete setting ${key} for account ${accountId}: ${error}`);
      throw new Error(`Database delete failed: ${error}`);
    }
  }

  /**
   * 删除账户的所有设置
   * @param accountId 账户ID
   * @returns 删除是否成功
   */
  async deleteAllSettings(accountId: string): Promise<boolean> {
    try {
      const result = await db.delete(settings).where(eq(settings.accountId, parseInt(accountId))) ;
      return result.lastInsertRowid === 0;
    } catch (error) {
      logger.error(`Failed to delete all settings for account ${accountId}: ${error}`);
      throw new Error(`Database delete failed: ${error}`);
    }
  }

  // 获取模型服务 API 地址
  async getModelServiceApiUrl(): Promise<string | null> {
    const accountId = await AuthService.getCurrentUserId();
    const setting = await this.getSettingByKey(accountId, 'MODEL_PROVIDER_URL');
    return setting ? setting.value : process.env.MODEL_PROVIDER_URL || null;
  }
}

const settingService = new SettingService();

export default settingService;