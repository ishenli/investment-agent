import { db } from '@server/lib/db';
import { assetPositions, assetMeta, accountFunds } from '@/drizzle/schema';
import { eq, and, gt } from 'drizzle-orm';
import logger from '@server/base/logger';
import { AssetType } from '@typings/asset';
import priceService from './priceService';
import { PositionType } from '@/types';
import assetMetaService from './assetMetaService';
import exchangeRateService from './exchangeRateService';
import Decimal from 'decimal.js';
import { CURRENCY_SYMBOLS } from '@shared/constant';

export interface PositionUpdateData {
  quantity?: number;
  averagePriceCents?: number;
  investmentMemo?: string; // 新增字段
  averageCost?: number;
}

export class PositionService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  /**
   * 更新仓位信息
   * @param positionId 仓位ID
   * @param updateData 更新数据
   * @returns 更新后的仓位信息
   */
  async updatePosition(positionId: number, updateData: PositionUpdateData) {
    try {
      // 验证仓位是否存在
      const existingPosition = await db.query.assetPositions.findFirst({
        where: eq(assetPositions.id, positionId),
      });

      if (!existingPosition) {
        throw new Error(`Position with id ${positionId} not found`);
      }

      // 准备更新数据
      const updatePayload: any = {
        updatedAt: new Date(),
      };

      if (updateData.quantity !== undefined) {
        updatePayload.quantity = updateData.quantity;
      }

      if (updateData.averagePriceCents !== undefined) {
        updatePayload.averagePriceCents = updateData.averagePriceCents;
      }

      if (updateData.averageCost !== undefined) {
        updatePayload.averageCost = updateData.averageCost;
      }

      // 执行更新操作
      const [updatedPosition] = await db
        .update(assetPositions)
        .set(updatePayload)
        .where(eq(assetPositions.id, positionId))
        .returning();

      logger.info(`Position ${positionId} updated successfully`);
      return updatedPosition;
    } catch (error) {
      logger.error(`Failed to update position ${positionId}: ${error}`);
      throw new Error(`Failed to update position: ${error}`);
    }
  }

  /**
   * 增加持仓数量
   * @param accountId 账户ID
   * @param symbol 股票代码
   * @param quantity 增加的数量
   * @param averagePriceCents 平均价格（以分为单位）
   * @returns 更新后的仓位信息
   */
  async increasePosition(
    accountId: number,
    symbol: string,
    quantity: number,
    averagePriceCents: number,
    sector: AssetType,
    currency: string = 'USD',
  ) {
    try {
      // 查找现有仓位
      const existingPosition = await db.query.assetPositions.findFirst({
        where: and(eq(assetPositions.accountId, accountId), eq(assetPositions.symbol, symbol)),
      });

      if (existingPosition) {
        // 如果存在现有仓位，更新数量和平均价格
        const newQuantity = new Decimal(existingPosition.quantity).plus(quantity).toNumber();
        // 计算新的平均价格：(原总成本 + 新增成本) / 新总数量（使用Decimal提高精度）
        const existingCost = new Decimal(existingPosition.averagePriceCents).mul(
          existingPosition.quantity,
        );
        const newCost = new Decimal(averagePriceCents).mul(quantity);
        const totalCost = existingCost.plus(newCost);
        const newAveragePriceCents = totalCost.div(newQuantity).round().toNumber();

        const [updatedPosition] = await db
          .update(assetPositions)
          .set({
            quantity: newQuantity,
            averagePriceCents: newAveragePriceCents,
            updatedAt: new Date(),
          })
          .where(eq(assetPositions.id, existingPosition.id))
          .returning();

        logger.info(`Position for ${symbol} increased successfully`);
        return updatedPosition;
      } else {
        // 如果不存在现有仓位，创建新仓位
        const [newPosition] = await db
          .insert(assetPositions)
          .values({
            accountId,
            symbol,
            quantity,
            averagePriceCents,
            createdAt: new Date(),
            updatedAt: new Date(),
            sector: sector || 'stock',
            currency,
          })
          .returning();

        logger.info(`New position for ${symbol} created successfully (currency: ${currency})`);
        return newPosition;
      }
    } catch (error) {
      logger.error(`Failed to increase position for ${symbol}: ${error}`);
      throw new Error(`Failed to increase position: ${error}`);
    }
  }

  /**
   * 处理交易对仓位的影响
   * @param accountId 账户ID
   * @param symbol 股票代码
   * @param quantity 交易数量
   * @param priceCents 交易价格（以分为单位）
   * @param transactionType 交易类型 ('buy' 或 'sell')
   * @param sector 资产类型
   * @param market 市场
   * @returns 更新后的仓位信息
   */
  async processTransaction(
    accountId: number,
    symbol: string,
    quantity: number,
    priceCents: number,
    transactionType: 'buy' | 'sell',
    sector: AssetType,
    currency: string = 'USD',
  ) {
    try {
      if (transactionType === 'buy') {
        // 买入时增加仓位
        return await this.increasePosition(accountId, symbol, quantity, priceCents, sector, currency);
      } else if (transactionType === 'sell') {
        // 卖出时减少仓位，仓位不存在时严格报错
        return await this.decreasePosition(accountId, symbol, quantity);
      } else {
        throw new Error(`Unsupported transaction type: ${transactionType}`);
      }
    } catch (error) {
      logger.error(`Failed to process transaction for ${symbol}: ${error}`);
      throw new Error(`Failed to process transaction: ${error}`);
    }
  }

  /**
   * 减少持仓数量
   * @param accountId 账户ID
   * @param symbol 股票代码
   * @param quantity 减少的数量
   * @returns 更新后的仓位信息或null（如果仓位被完全平仓）
   */
  async decreasePosition(accountId: number, symbol: string, quantity: number) {
    try {
      // 查找现有仓位
      const existingPosition = await db.query.assetPositions.findFirst({
        where: and(eq(assetPositions.accountId, accountId), eq(assetPositions.symbol, symbol)),
      });

      if (!existingPosition) {
        throw new Error(`Position for ${symbol} not found`);
      }

      const newQuantity = existingPosition.quantity - quantity;

      if (newQuantity < 0) {
        throw new Error(
          `Cannot decrease position by ${quantity}, only ${existingPosition.quantity} available`,
        );
      }

      if (newQuantity === 0) {
        // 如果数量为0，删除仓位
        await db.delete(assetPositions).where(eq(assetPositions.id, existingPosition.id));

        logger.info(`Position for ${symbol} closed successfully`);
        return null;
      } else {
        // 更新仓位数量
        const [updatedPosition] = await db
          .update(assetPositions)
          .set({
            quantity: newQuantity,
            updatedAt: new Date(),
          })
          .where(eq(assetPositions.id, existingPosition.id))
          .returning();

        logger.info(`Position for ${symbol} decreased successfully`);
        return updatedPosition;
      }
    } catch (error) {
      logger.error(`Failed to decrease position for ${symbol}: ${error}`);
      throw new Error(`Failed to decrease position: ${error}`);
    }
  }

  /**
   * 获取账户的所有持仓
   * @param accountId 账户ID
   * @returns 账户持仓列表
   */
  async getPositionsByAccount(accountId: number) {
    try {
      const positions = await db.query.assetPositions.findMany({
        where: and(
          eq(assetPositions.accountId, accountId),
          gt(assetPositions.quantity, 0), // 只返回数量大于0的持仓
        ),
      });

      return positions;
    } catch (error) {
      logger.error(`Failed to get positions for account ${accountId}: ${error}`);
      throw new Error(`Failed to get positions: ${error}`);
    }
  }

  /**
   * 获取特定股票的持仓
   * @param accountId 账户ID
   * @param symbol 股票代码
   * @returns 特定股票的持仓信息
   */
  async getPositionBySymbol(accountId: number, symbol: string) {
    try {
      const position = await db.query.assetPositions.findFirst({
        where: and(
          eq(assetPositions.accountId, accountId),
          eq(assetPositions.symbol, symbol),
          gt(assetPositions.quantity, 0), // 只返回数量大于0的持仓
        ),
      });

      return position;
    } catch (error) {
      logger.error(`Failed to get position for ${symbol} in account ${accountId}: ${error}`);
      throw new Error(`Failed to get position: ${error}`);
    }
  }

  /**
   * 删除仓位（谨慎使用）
   * @param positionId 仓位ID
   * @returns 删除结果
   */
  async deletePosition(positionId: number) {
    try {
      // 验证仓位是否存在
      const existingPosition = await db.query.assetPositions.findFirst({
        where: eq(assetPositions.id, positionId),
      });

      if (!existingPosition) {
        throw new Error(`Position with id ${positionId} not found`);
      }

      // 执行删除操作
      await db.delete(assetPositions).where(eq(assetPositions.id, positionId));

      logger.info(`Position ${positionId} deleted successfully`);
      return { success: true, message: 'Position deleted successfully' };
    } catch (error) {
      logger.error(`Failed to delete position ${positionId}: ${error}`);
      throw new Error(`Failed to delete position: ${error}`);
    }
  }

  /**
   * 获取实时价格的当前持仓
   * @param accountId 账户ID
   * @returns 包含实时价格的当前持仓（原始币种 + USD 转换值）
   */
  async getCurrentPositions(accountId: string): Promise<PositionType[]> {
    try {
      // 获取持仓数量大于0的仓位
      const positionRecords = await db.query.assetPositions.findMany({
        where: and(
          eq(assetPositions.accountId, parseInt(accountId)),
          gt(assetPositions.quantity, 0),
        ),
      });

      // 获取所有持仓的实时价格
      const symbols = positionRecords.map((record: { symbol: string }) => record.symbol);
      const priceMap = await priceService.getLatestPrices(symbols);

      // 获取所有持仓的中文名称和市场信息
      const assetMetas = await assetMetaService.getAllAssetMetas();
      const assetMetaMap = new Map(assetMetas.map((meta) => [meta.symbol, meta]));

      // 收集所有涉及的币种，批量获取汇率
      const currencies = new Set<string>();
      for (const record of positionRecords) {
        const currency = record.currency || 'USD';
        if (currency !== 'USD') {
          currencies.add(currency);
        }
      }
      const rateMap: Record<string, number> = {};
      for (const currency of currencies) {
        rateMap[currency] = await exchangeRateService.getRate(currency, 'USD');
      }

      // 计算各持仓的 USD 市值和 USD 未实现盈亏
      const positionUSDValues = positionRecords.map((record) => {
        const latestPrice = priceMap[record.symbol]?.price || record.averagePriceCents / 100;
        const currency = record.currency || 'USD';
        const rate = currency === 'USD' ? 1 : (rateMap[currency] ?? 1);
        const marketValue = new Decimal(record.quantity).mul(latestPrice).toNumber();
        const marketValueUSD = new Decimal(marketValue).mul(rate).toNumber();
        const unrealizedPnL = new Decimal(latestPrice)
          .minus(record.averagePriceCents / 100)
          .mul(record.quantity)
          .toNumber();
        const unrealizedPnLUSD = new Decimal(unrealizedPnL).mul(rate).toNumber();
        return { marketValue, marketValueUSD, unrealizedPnL, unrealizedPnLUSD, rate };
      });

      // 计算 USD 计价的总市值（仅股票持仓）
      const totalStockMarketValueUSD = positionUSDValues.reduce(
        (sum, v) => new Decimal(sum).plus(v.marketValueUSD).toNumber(),
        0,
      );

      // 获取账户现金余额
      const accountFundsRecords = await db.query.accountFunds.findMany({
        where: eq(accountFunds.accountId, parseInt(accountId)),
      });

      // 计算包含现金的账户总价值（统一转换为 USD）
      let cashBalanceUSD = 0;
      for (const fund of accountFundsRecords) {
        const fundCurrency = fund.currency || 'USD';
        const rate = fundCurrency === 'USD' ? 1 : (rateMap[fundCurrency] ?? await exchangeRateService.getRate(fundCurrency, 'USD'));
        cashBalanceUSD = new Decimal(cashBalanceUSD).plus(new Decimal(fund.amountCents / 100).mul(rate)).toNumber();
      }
      const totalAccountValueUSD = new Decimal(totalStockMarketValueUSD)
        .plus(new Decimal(cashBalanceUSD))
        .toNumber();

      const positionsResult = positionRecords
        .map((record, index): PositionType => {
          const latestPrice = priceMap[record.symbol]?.price || record.averagePriceCents / 100;
          const currency = record.currency || 'USD';
          const rate = positionUSDValues[index].rate;
          const marketValue = positionUSDValues[index].marketValue;
          const marketValueUSD = positionUSDValues[index].marketValueUSD;
          const unrealizedPnL = positionUSDValues[index].unrealizedPnL;
          const unrealizedPnLUSD = positionUSDValues[index].unrealizedPnLUSD;

          // 计算持仓占比（基于 USD 总值，确保跨币种准确）
          const positionRatio =
            totalAccountValueUSD > 0
              ? new Decimal(marketValueUSD).div(totalAccountValueUSD).toNumber()
              : 0;

          // 获取中文名称、市场信息、投资笔记、assetMetaId和logoUrl
          const assetMeta = assetMetaMap.get(record.symbol);
          const chineseName = assetMeta?.chineseName || null;
          // 优先使用 assetMeta 的 market，fallback 根据 sector/currency 推断
          const market = assetMeta?.market
            || (record.sector === 'fund' && record.currency === 'CNY' ? 'CN' : undefined);
          const investmentMemo = assetMeta?.investmentMemo || null;
          const assetMetaId = assetMeta?.id || null;
          const logoUrl = assetMeta?.logoUrl || null;

          return {
            id: record.id.toString(),
            accountId: record.accountId.toString(),
            symbol: record.symbol,
            chineseName,
            quantity: record.quantity,
            averageCost: record.averagePriceCents / 100,
            currentPrice: latestPrice,
            marketValue,
            marketValueUSD,
            unrealizedPnL,
            unrealizedPnLUSD,
            positionRatio,
            market,
            currency,
            sector: (record.sector as PositionType['sector']) || 'stock',
            investmentMemo,
            assetMetaId,
            logoUrl,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          };
        })
        .sort((a, b) => (b.marketValueUSD ?? b.marketValue) - (a.marketValueUSD ?? a.marketValue)); // 根据 USD 市值大小排列

      return positionsResult;
    } catch (error) {
      logger.error(`Failed to get current positions for account ${accountId}: ${error}`);
      return [];
    }
  }

  async getPositionAmountSummary(accountId: string) {
    // 获取持仓信息
    const positions = await this.getCurrentPositions(accountId);

    // 按币种分组
    const usdPositions = positions.filter((p) => (p.currency || 'USD') === 'USD');
    const cnyPositions = positions.filter((p) => p.currency === 'CNY');
    const hkdPositions = positions.filter((p) => p.currency === 'HKD');

    // 计算 USD 持仓市值
    const stockAccountValue = usdPositions.reduce(
      (sum, pos) => new Decimal(sum).plus(pos.marketValue || 0).toNumber(),
      0,
    );

    // 计算 USD 总投资额
    const totalInvestment = usdPositions.reduce(
      (sum, position) =>
        new Decimal(sum).plus(new Decimal(position.quantity).mul(position.averageCost)).toNumber(),
      0,
    );

    // 计算 USD 未实现盈亏
    const usdUnrealizedPnL = usdPositions.reduce(
      (sum, position) => new Decimal(sum).plus(position.unrealizedPnL).toNumber(),
      0,
    );

    // 计算 CNY 持仓市值（原始币种）
    const cnyStockValue = cnyPositions.reduce(
      (sum, pos) => new Decimal(sum).plus(pos.marketValue || 0).toNumber(),
      0,
    );

    // 计算 CNY 总投资额（原始币种）
    const cnyTotalInvestment = cnyPositions.reduce(
      (sum, position) =>
        new Decimal(sum).plus(new Decimal(position.quantity).mul(position.averageCost)).toNumber(),
      0,
    );

    // 计算 CNY 未实现盈亏（原始币种）
    const cnyUnrealizedPnL = cnyPositions.reduce(
      (sum, position) => new Decimal(sum).plus(position.unrealizedPnL).toNumber(),
      0,
    );

    // 计算 HKD 持仓市值（原始币种）
    const hkdStockValue = hkdPositions.reduce(
      (sum, pos) => new Decimal(sum).plus(pos.marketValue || 0).toNumber(),
      0,
    );

    // 计算 HKD 总投资额（原始币种）
    const hkdTotalInvestment = hkdPositions.reduce(
      (sum, position) =>
        new Decimal(sum).plus(new Decimal(position.quantity).mul(position.averageCost)).toNumber(),
      0,
    );

    // 计算 HKD 未实现盈亏（原始币种）
    const hkdUnrealizedPnL = hkdPositions.reduce(
      (sum, position) => new Decimal(sum).plus(position.unrealizedPnL).toNumber(),
      0,
    );

    // 计算统一 USD 计价的未实现盈亏（用于向后兼容）
    const unrealizedPnL = positions.reduce(
      (sum, position) => new Decimal(sum).plus(position.unrealizedPnLUSD ?? position.unrealizedPnL).toNumber(),
      0,
    );

    return {
      stockAccountValue,
      totalInvestment,
      unrealizedPnL,
      // USD 股票未实现盈亏
      usdUnrealizedPnL,
      // 人民币资产汇总
      cnyStockValue,
      cnyTotalInvestment,
      cnyUnrealizedPnL,
      hasCnyAssets: cnyPositions.length > 0,
      // 港币资产汇总
      hkdStockValue,
      hkdTotalInvestment,
      hkdUnrealizedPnL,
      hasHkdAssets: hkdPositions.length > 0,
    };
  }

  /**
   * 生成持仓概要的 Markdown 格式内容
   *
   * @param accountId - 账户 ID
   * @returns Markdown 格式的持仓概要字符串
   */
  async getPositionSummaryMarkdown(accountId: string): Promise<string> {
    const positions = await this.getCurrentPositions(accountId);

    if (positions.length === 0) {
      return '## 持仓概要\n\n*当前无持仓*\n';
    }

    const sections: string[] = [];

    sections.push('## 持仓概要', '');

    // 计算总览数据（使用 USD 转换值）
    const totalMarketValueUSD = positions.reduce(
      (sum, pos) => new Decimal(sum).plus(pos.marketValueUSD ?? pos.marketValue).toNumber(),
      0,
    );

    // 按币种分别计算总投资额
    const totalInvestmentUSD = positions.reduce(
      (sum, pos) => {
        const investment = new Decimal(pos.quantity).mul(pos.averageCost);
        const currency = pos.currency || 'USD';
        // 简化处理：使用 marketValueUSD/marketValue 的比率来估算 USD 成本
        if (currency === 'USD' || !pos.marketValueUSD) {
          return new Decimal(sum).plus(investment).toNumber();
        }
        const rate = pos.marketValueUSD / pos.marketValue;
        return new Decimal(sum).plus(investment.mul(rate)).toNumber();
      },
      0,
    );

    const unrealizedPnLUSD = positions.reduce(
      (sum, pos) => new Decimal(sum).plus(pos.unrealizedPnLUSD ?? pos.unrealizedPnL).toNumber(),
      0,
    );

    const unrealizedPnLPercent =
      totalInvestmentUSD > 0 ? ((unrealizedPnLUSD / totalInvestmentUSD) * 100).toFixed(2) : '0.00';

    // 总览表格
    sections.push('### 账户总览', '');
    sections.push('| 指标 | 数值 |');
    sections.push('|------|------|');
    sections.push(`| 总市值(USD) | $${totalMarketValueUSD.toFixed(2)} |`);
    sections.push(`| 总投资额(USD) | $${totalInvestmentUSD.toFixed(2)} |`);
    sections.push(`| 未实现盈亏(USD) | $${unrealizedPnLUSD.toFixed(2)} |`);
    sections.push(`| 盈亏比例 | ${unrealizedPnLPercent}% |`);
    sections.push('');

    // 获取币种符号的辅助函数
    const getCurrencySymbol = (currency?: string): string => {
      switch (currency) {
        case 'CNY': return '¥';
        case 'HKD': return 'HK$';
        default: return '$';
      }
    };

    // 持仓明细表格
    sections.push('### 持仓明细', '');
    sections.push('| 股票代码 | 数量 | 成本价 | 现价 | 市值 | 未实现盈亏 | 盈亏% |');
    sections.push('|----------|------|--------|------|------|------------|-------|');

    positions.forEach((pos) => {
      const cs = getCurrencySymbol(pos.currency);
      const costPrice = pos.averageCost.toFixed(2);
      const currentPrice = pos.currentPrice ? pos.currentPrice.toFixed(2) : 'N/A';
      const marketValue = (pos.marketValue || 0).toFixed(2);
      const unrealizedPnL = pos.unrealizedPnL.toFixed(2);
      const pnlPercent =
        pos.averageCost > 0
          ? (((pos.currentPrice || 0) - pos.averageCost) / pos.averageCost * 100).toFixed(2)
          : '0.00';

      sections.push(
        `| ${pos.symbol} | ${pos.quantity} | ${cs}${costPrice} | ${cs}${currentPrice} | ${cs}${marketValue} | ${cs}${unrealizedPnL} | ${pnlPercent}% |`,
      );
    });

    return sections.join('\n');
  }
}

const positionService = new PositionService();

export default positionService;
