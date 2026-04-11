/**
 * Exchange Rate Controller
 *
 * 汇率管理 API 控制器
 */
import { WithRequestContext } from '@server/base/decorators';
import { BaseBizController } from './base';
import exchangeRateService from '@server/service/exchangeRateService';
import { z } from 'zod';
import logger from '@server/base/logger';

// 验证 Schema
const UpdateRateSchema = z.object({
  fromCurrency: z.string().min(1),
  toCurrency: z.string().default('USD'),
  rate: z.number().positive(),
});

const DeleteRateSchema = z.object({
  fromCurrency: z.string().min(1),
  toCurrency: z.string().default('USD'),
});

export class ExchangeRateBizController extends BaseBizController {
  /**
   * 获取所有汇率
   */
  @WithRequestContext()
  async getRates() {
    try {
      const rates = await exchangeRateService.getAllRates();
      return this.success({ rates });
    } catch (error) {
      logger.error('[ExchangeRateBizController] Failed to get rates:', error);
      return this.error('获取汇率失败', 'get_rates_error');
    }
  }

  /**
   * 更新指定货币汇率
   */
  @WithRequestContext()
  async updateRate(body: { fromCurrency: string; toCurrency: string; rate: number }) {
    try {
      // 验证请求体
      const validationResult = UpdateRateSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { fromCurrency, toCurrency, rate } = validationResult.data;

      const result = await exchangeRateService.setRate(fromCurrency, toCurrency, rate, 'manual');

      return this.success({
        fromCurrency: result.fromCurrency,
        toCurrency: result.toCurrency,
        rate: result.rate,
        source: result.source,
        lastUpdated: result.lastUpdated,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      logger.error('[ExchangeRateBizController] Failed to update rate:', error);
      return this.error('更新汇率失败', 'update_rate_error');
    }
  }

  /**
   * 从在线 API 获取汇率
   */
  @WithRequestContext()
  async fetchFromAPI() {
    try {
      const rates = await exchangeRateService.fetchFromAPI();
      return this.success({
        rates,
        message: `成功从 API 获取 ${rates.length} 个汇率`,
      });
    } catch (error) {
      logger.error('[ExchangeRateBizController] Failed to fetch rates from API:', error);
      return this.error('从 API 获取汇率失败', 'fetch_api_error');
    }
  }

  /**
   * 重置为默认汇率
   */
  @WithRequestContext()
  async resetToDefaults() {
    try {
      await exchangeRateService.resetToDefaults();
      const rates = await exchangeRateService.getAllRates();
      return this.success({
        rates,
        message: '汇率已重置为默认值',
      });
    } catch (error) {
      logger.error('[ExchangeRateBizController] Failed to reset rates:', error);
      return this.error('重置汇率失败', 'reset_rates_error');
    }
  }

  /**
   * 删除指定货币对的汇率
   */
  @WithRequestContext()
  async deleteRate(query: { fromCurrency: string; toCurrency: string }) {
    try {
      // 验证查询参数
      const validationResult = DeleteRateSchema.safeParse(query);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { fromCurrency, toCurrency } = validationResult.data;

      const result = await exchangeRateService.deleteRate(fromCurrency, toCurrency);

      if (!result) {
        return this.error('删除汇率失败，汇率不存在', 'delete_rate_not_found');
      }

      return this.success({ message: '汇率已删除' });
    } catch (error) {
      logger.error('[ExchangeRateBizController] Failed to delete rate:', error);
      return this.error('删除汇率失败', 'delete_rate_error');
    }
  }

  /**
   * 初始化默认汇率
   */
  @WithRequestContext()
  async initializeDefaults() {
    try {
      await exchangeRateService.initializeDefaultRates();
      const rates = await exchangeRateService.getAllRates();
      return this.success({
        rates,
        message: '默认汇率初始化成功',
      });
    } catch (error) {
      logger.error('[ExchangeRateBizController] Failed to initialize defaults:', error);
      return this.error('初始化默认汇率失败', 'init_defaults_error');
    }
  }
}
