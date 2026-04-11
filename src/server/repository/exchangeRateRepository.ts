/**
 * Exchange Rate Repository
 *
 * 数据访问层：负责 exchange_rates 表的数据库操作
 */
import { db } from '@server/lib/db';
import { exchangeRates } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { BaseIntRepository } from './base';

/**
 * Exchange Rate 实体接口
 */
export interface ExchangeRate {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: 'manual' | 'api' | 'default';
  lastUpdated: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ExchangeRate Repository
 * 管理汇率数据
 */
export class ExchangeRateRepository extends BaseIntRepository<ExchangeRate> {
  constructor() {
    super(exchangeRates);
  }

  /**
   * 根据货币对查找汇率
   */
  async findByCurrencyPair(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    return this.findOne(
      and(
        eq(exchangeRates.fromCurrency, fromCurrency),
        eq(exchangeRates.toCurrency, toCurrency)
      )!
    );
  }

  /**
   * 创建或更新汇率（Upsert）
   * @param fromCurrency 源货币
   * @param toCurrency 目标货币
   * @param rate 汇率值
   * @param source 来源
   * @returns 创建或更新的汇率
   */
  async upsertRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    source: 'manual' | 'api' | 'default' = 'manual'
  ): Promise<ExchangeRate> {
    const existing = await this.findByCurrencyPair(fromCurrency, toCurrency);

    if (existing) {
      // 更新现有汇率
      return (await this.update(existing.id, {
        rate,
        source,
        lastUpdated: new Date(),
      }))!;
    } else {
      // 创建新汇率
      return this.create({
        fromCurrency,
        toCurrency,
        rate,
        source,
        lastUpdated: new Date(),
      });
    }
  }

  /**
   * 获取所有汇率
   */
  async getAllRates(): Promise<ExchangeRate[]> {
    return this.findAll();
  }

  /**
   * 根据货币对删除汇率
   */
  async deleteByCurrencyPair(fromCurrency: string, toCurrency: string): Promise<boolean> {
    const rate = await this.findByCurrencyPair(fromCurrency, toCurrency);
    if (!rate) {
      return false;
    }
    return this.delete(rate.id);
  }

  /**
   * 批量获取多个货币对的汇率
   * @param pairs 货币对数组 [{ fromCurrency, toCurrency }]
   * @returns Map<fromCurrency:toCurrency, ExchangeRate>
   */
  async findByCurrencyPairs(
    pairs: Array<{ fromCurrency: string; toCurrency: string }>
  ): Promise<Map<string, ExchangeRate>> {
    const allRates = await this.getAllRates();
    const map = new Map<string, ExchangeRate>();

    for (const pair of pairs) {
      const key = `${pair.fromCurrency}:${pair.toCurrency}`;
      const rate = allRates.find(
        (r) => r.fromCurrency === pair.fromCurrency && r.toCurrency === pair.toCurrency
      );
      if (rate) {
        map.set(key, rate);
      }
    }

    return map;
  }
}

// 导出单例实例
export const exchangeRateRepository = new ExchangeRateRepository();
