import { WithRequestContext } from '@server/base/decorators';
import { BaseBizController } from './base';
import settingService from '@server/service/settingService';
import { AuthService } from '@server/service/authService';
import { z } from 'zod';
import logger from '@server/base/logger';

// 定义设置键的枚举，对应注释中的配置项
const SettingKeySchema = z.enum([
  'MODEL_PROVIDER_URL',
  'AGENT_PROVIDER_URL',
  'MODEL_PROVIDER_API_KEY',
  'FINNHUB_API_KEY',
  'LANGSMITH_API_KEY',
  'FINANCIAL_DATASETS_KEY',
  'TAVILY_API_KEY',
]);

const SettingSchema = z.object({
  key: SettingKeySchema,
  value: z.string(),
});

const DeleteSettingSchema = z.object({
  key: SettingKeySchema,
});

export class SettingBizController extends BaseBizController {
  @WithRequestContext()
  async getSettings() {
    try {
      // 1. 获取当前用户ID
      const accountInfo = await AuthService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未认证', 'unauthorized');
      }

      // 2. 获取用户的所有设置
      const settings = await settingService.getSettingsByAccountId(parseInt(accountInfo.id));
      
      // 3. 转换为键值对格式
      const settingsMap: Record<string, string> = {};
      settings.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });

      // 4. 返回成功响应
      return this.success(settingsMap);
    } catch (error) {
      logger.error('[SettingBizController] 获取设置失败:', error);
      return this.error('获取设置失败', 'get_settings_error');
    }
  }

  @WithRequestContext()
  async updateSetting(body: { key: string; value: string }) {
    try {
      // 1. 获取当前用户ID
      const accountInfo = await AuthService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('账户未认证', 'unauthorized');
      }

      // 2. 验证请求体
      const validationResult = SettingSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { key, value } = validationResult.data;

      // 3. 更新或创建设置
      const setting = await settingService.setSetting(accountInfo.id, key, value);

      // 4. 返回成功响应
      return this.success({
        key: setting.key,
        value: setting.value,
        updatedAt: setting.updatedAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      logger.error('[SettingBizController] 更新设置失败:', error);
      return this.error('更新设置失败', 'update_settings_error');
    }
  }

  @WithRequestContext()
  async deleteSetting(query: { key: string }) {
    try {
      // 1. 获取当前用户ID
      const accountInfo = await AuthService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未认证', 'unauthorized');
      }

      // 2. 验证查询参数
      const validationResult = DeleteSettingSchema.safeParse(query);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { key } = validationResult.data;

      // 3. 删除设置
      const result = await settingService.deleteSetting(accountInfo.id, key);

      if (!result) {
        return this.error('删除设置失败', 'delete_settings_error');
      }

      // 4. 返回成功响应
      return this.success({ message: '设置已删除' });
    } catch (error) {
      logger.error('[SettingBizController] 删除设置失败:', error);
      return this.error('删除设置失败', 'delete_settings_error');
    }
  }
}