import { PositionAsset, Portfolio, RiskInsights } from '@renderer/store/position/types';
import priceService from '@server/service/priceService';
import logger from '../base/logger';

// 风险计算服务
export class RiskCalculatorService {
  // 计算集中度风险
  static calculateConcentrationRisk(
    positions: PositionAsset[],
    riskMode: 'retail' | 'advanced',
    portfolio?: Portfolio,
  ): number {
    if (positions.length === 0) return 0;

    // 如果没有投资组合信息或总价值为0，返回默认风险评分
    if (!portfolio || portfolio.totalValue <= 0) {
      return 50; // 默认风险评分
    }

    // 计算最大的单个资产权重（基于整个账户总价值）
    const maxWeight = Math.max(
      ...positions.map((pos) => (pos.marketValue / portfolio.totalValue) * 100),
    );

    // 根据风险模式调整阈值
    const threshold = riskMode === 'retail' ? 10 : 5;

    // 优化后的风险评分计算公式
    // 当最大权重超过阈值时，风险评分应该更高
    // 使用更敏感的计算方式，使得超过阈值后风险评分增长更快
    let riskScore: number;
    if (maxWeight <= threshold) {
      // 如果最大权重未超过阈值，风险评分线性增长
      riskScore = (maxWeight / threshold) * 50;
    } else {
      // 如果最大权重超过阈值，风险评分按平方增长，更好地反映风险
      const excessRatio = (maxWeight - threshold) / threshold;
      riskScore = 50 + excessRatio * excessRatio * 50;
    }

    // 确保风险评分在0-100范围内
    return Math.min(100, Math.max(0, riskScore));
  }

  // 计算资产配置风险
  static calculateAllocationRisk(
    positions: PositionAsset[],
    riskMode: 'retail' | 'advanced',
    portfolio?: Portfolio,
  ): number {
    if (positions.length === 0) return 0;

    // 如果没有投资组合信息或总价值为0，返回默认风险评分
    if (!portfolio || portfolio.totalValue <= 0) {
      return 50; // 默认风险评分
    }

    // 按资产类别分组计算市值
    const categoryMarketValues: Record<string, number> = {};

    // 计算各类别资产的总市值
    positions.forEach((position) => {
      const sector = position.sector || 'stock';
      categoryMarketValues[sector] = (categoryMarketValues[sector] || 0) + position.marketValue;
    });

    // 计算各类别资产的占比
    const categoryWeights: Record<string, number> = {};

    // 添加各类别资产的占比
    Object.entries(categoryMarketValues).forEach(([category, marketValue]) => {
      categoryWeights[category] = (marketValue / portfolio.totalValue) * 100;
    });

    // 添加现金占比
    if (portfolio.cashValue > 0) {
      categoryWeights['现金'] = (portfolio.cashValue / portfolio.totalValue) * 100;
    }

    // 计算行业集中度 (使用Herfindahl-Hirschman指数)
    let hhi = 0;
    Object.values(categoryWeights).forEach((weight) => {
      hhi += (weight / 100) ** 2;
    });

    // 转换为风险评分 (0-100)
    // HHI范围从1/n (完全分散) 到1 (完全集中)
    const n = Object.keys(categoryWeights).length;
    if (n === 0) return 0; // 避免除零错误

    const minHHI = 1 / n; // 完全分散
    const normalizedRisk = ((hhi - minHHI) / (1 - minHHI)) * 100;

    return normalizedRisk;
  }

  // 计算相关性风险
  static async calculateCorrelationRisk(
    positions: PositionAsset[],
    riskMode: 'retail' | 'advanced',
  ): Promise<number> {
    if (positions.length <= 1) return 0;

    // 获取资产历史价格数据（从数据库获取真实数据）
    const priceData = await this.getHistoricalPriceData(positions);

    // 计算资产间的相关性矩阵
    const correlationMatrix = this.calculateCorrelationMatrix(priceData);

    // 计算平均相关性
    let sumCorrelations = 0;
    let count = 0;

    for (let i = 0; i < correlationMatrix.length; i++) {
      for (let j = i + 1; j < correlationMatrix[i].length; j++) {
        // 取绝对值，因为负相关性也代表一定的风险分散效果
        sumCorrelations += Math.abs(correlationMatrix[i][j]);
        count++;
      }
    }

    const avgCorrelation = count > 0 ? sumCorrelations / count : 0;

    // 转换为风险评分 (0-100)
    // 相关性越高，风险评分越高
    const riskScore = avgCorrelation * 100;

    return riskScore;
  }

  // 生成风险洞察
  static async generateRiskInsights(
    positions: PositionAsset[],
    portfolio: Portfolio,
  ): Promise<RiskInsights> {
    // 计算相关性矩阵数据
    let correlationMatrix: number[][] = [];
    let highCorrelationPairs: Array<{ asset1: string; asset2: string; correlation: number }> = [];

    if (positions.length > 1) {
      const priceData = await this.getHistoricalPriceData(positions);
      correlationMatrix = this.calculateCorrelationMatrix(priceData);
      highCorrelationPairs = await this.getHighCorrelationPairs(positions);
    }

    return {
      id: `risk-insights-${Date.now()}`,
      portfolioId: portfolio.id,
      timestamp: new Date(),
      concentrationData: {
        topAssets: positions
          .map((position) => ({
            ...position,
            weight: (position.marketValue / portfolio.totalValue) * 100,
          }))
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 5)
          .map((position) => ({
            symbol: position.symbol,
            name: position.name,
            weight: parseFloat(position.weight.toFixed(2)), // 格式化为两位小数
          })),
        singleAssetThreshold: portfolio.riskMode === 'retail' ? 10 : 5,
        concentrationAlerts: this.getConcentrationAlerts(positions, portfolio.riskMode, portfolio),
      },
      allocationData: {
        categoryAllocation: this.getCategoryAllocation(positions, portfolio),
        allocationAlerts: this.getAllocationAlerts(positions, portfolio),
      },
      correlationData: {
        // correlationMatrix: 用于相关性热力图显示，被 CorrelationHeatmap 组件使用
        // correlationMatrix: correlationMatrix,
        // highCorrelationPairs: 用于相关性资产对列表显示，被 RiskDashboard 组件使用
      },
      strategySuggestions: this.generateStrategySuggestions(positions, portfolio),
    };
  }

  // 获取集中度警报
  private static getConcentrationAlerts(
    positions: PositionAsset[],
    riskMode: 'retail' | 'advanced',
    portfolio?: Portfolio,
  ): string[] {
    const alerts: string[] = [];
    const threshold = riskMode === 'retail' ? 10 : 5;

    // 如果没有投资组合信息或总价值为0，返回空数组
    if (!portfolio || portfolio.totalValue <= 0) {
      return alerts;
    }

    positions.forEach((position) => {
      const weight = (position.marketValue / portfolio.totalValue) * 100;
      if (weight > threshold) {
        alerts.push(`${position.symbol}持仓占比${weight.toFixed(1)}%，超过${threshold}%阈值`);
      }
    });

    return alerts;
  }

  // 获取资产类别分配
  private static getCategoryAllocation(
    positions: PositionAsset[],
    portfolio?: Portfolio,
  ): Array<{ category: string; weight: number }> {
    // 如果没有投资组合信息或总价值为0，返回空数组
    if (!portfolio || portfolio.totalValue <= 0) {
      return [];
    }

    // 按资产类别分组计算市值
    const categoryMarketValues: Record<string, number> = {};

    // 计算各类别资产的总市值
    positions.forEach((position) => {
      const sector = position.sector || 'stock';
      categoryMarketValues[sector] = (categoryMarketValues[sector] || 0) + position.marketValue;
    });

    // 基于整个账户总价值计算各类别资产的占比
    const categoryAllocations: Array<{ category: string; weight: number }> = [];

    // 添加各类别资产的占比
    Object.entries(categoryMarketValues).forEach(([category, marketValue]) => {
      const weight = (marketValue / portfolio.totalValue) * 100;
      categoryAllocations.push({
        category: category === 'stock' ? '股票' : category, // 将'stock'显示为'股票'
        weight: parseFloat(weight.toFixed(2)), // 格式化为两位小数
      });
    });

    // 添加现金占比
    if (portfolio.cashValue > 0) {
      const cashWeight = (portfolio.cashValue / portfolio.totalValue) * 100;
      categoryAllocations.push({
        category: '现金',
        weight: parseFloat(cashWeight.toFixed(2)), // 格式化为两位小数
      });
    }

    return categoryAllocations;
  }

  // 获取资产配置警报
  private static getAllocationAlerts(positions: PositionAsset[], portfolio?: Portfolio): string[] {
    const alerts: string[] = [];

    // 如果没有投资组合信息或总价值为0，返回空数组
    if (!portfolio || portfolio.totalValue <= 0) {
      return alerts;
    }

    // 按资产类别分组计算市值
    const categoryMarketValues: Record<string, number> = {};

    // 计算各类别资产的总市值
    positions.forEach((position) => {
      const sector = position.sector || 'stock';
      categoryMarketValues[sector] = (categoryMarketValues[sector] || 0) + position.marketValue;
    });

    // 检查各类别资产占比是否过高
    Object.entries(categoryMarketValues).forEach(([category, marketValue]) => {
      const weight = (marketValue / portfolio.totalValue) * 100;
      const categoryName = category === 'stock' ? '股票' : category;

      if (weight > 50) {
        alerts.push(`${categoryName}配置占比${weight.toFixed(1)}%，建议分散投资`);
      }
    });

    // 检查现金比例是否过高或过低
    if (portfolio.cashValue > 0) {
      const cashWeight = (portfolio.cashValue / portfolio.totalValue) * 100;
      if (cashWeight > 30) {
        alerts.push(`现金配置占比${cashWeight.toFixed(1)}%，可能影响长期收益`);
      } else if (cashWeight < 5) {
        alerts.push(`现金储备不足(${cashWeight.toFixed(1)}%)，建议保持适当现金比例`);
      }
    }

    return alerts;
  }

  // 获取高相关性资产对
  private static async getHighCorrelationPairs(
    positions: PositionAsset[],
  ): Promise<Array<{ asset1: string; asset2: string; correlation: number }>> {
    const pairs: Array<{ asset1: string; asset2: string; correlation: number }> = [];

    if (positions.length < 2) return pairs;

    // 获取资产历史价格数据
    const priceData = await this.getHistoricalPriceData(positions);

    // 计算资产间的相关性矩阵
    const correlationMatrix = this.calculateCorrelationMatrix(priceData);

    // 找出相关性较高的资产对（绝对值大于0.5）
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const correlation = correlationMatrix[i][j];
        if (Math.abs(correlation) > 0.5) {
          pairs.push({
            asset1: positions[i].symbol,
            asset2: positions[j].symbol,
            correlation: correlation,
          });
        }
      }
    }

    return pairs;
  }

  // 获取历史价格数据（从数据库获取真实数据，不足时使用模拟数据补充）
  private static async getHistoricalPriceData(positions: PositionAsset[]): Promise<number[][]> {
    // 假设我们需要30天的历史数据
    const days = 30;
    const priceData: number[][] = [];

    // 为每个持仓获取历史价格数据
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const symbol = position.symbol;

      try {
        // 从数据库获取历史价格数据（最近24小时的数据点）
        const historicalPrices = await priceService.getHistoricalPrices(symbol, 24 * days);

        if (historicalPrices.length > 0) {
          // 使用数据库中的真实价格数据
          const assetPrices = historicalPrices.map((price) => price.price);
          priceData.push(assetPrices);
        } else {
          // 如果没有历史数据，生成模拟数据作为补充
          const assetPrices: number[] = [];
          let basePrice = position.currentPrice || 100;
          for (let d = 0; d < days; d++) {
            // 添加一些随机波动
            const change = (Math.random() - 0.5) * 0.1; // ±5% 的日波动
            basePrice = basePrice * (1 + change);
            assetPrices.push(basePrice);
          }
          priceData.push(assetPrices);
        }
      } catch (error) {
        // 如果获取数据时出错，生成模拟数据作为补充
        console.warn(`获取${symbol}历史数据时出错:`, error);
        const assetPrices: number[] = [];
        let basePrice = position.currentPrice || 100;
        for (let d = 0; d < days; d++) {
          // 添加一些随机波动
          const change = (Math.random() - 0.5) * 0.1; // ±5% 的日波动
          basePrice = basePrice * (1 + change);
          assetPrices.push(basePrice);
        }
        priceData.push(assetPrices);
      }
    }

    return priceData;
  }

  // 计算相关性矩阵
  private static calculateCorrelationMatrix(priceData: number[][]): number[][] {
    const n = priceData.length;
    const correlationMatrix: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1.0; // 自身相关性为1
        } else {
          correlationMatrix[i][j] = this.calculatePearsonCorrelation(priceData[i], priceData[j]);
        }
      }
    }

    return correlationMatrix;
  }

  // 计算皮尔逊相关系数
  private static calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;

    // 计算均值
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    // 计算协方差和标准差
    let covXY = 0;
    let varX = 0;
    let varY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;

      covXY += diffX * diffY;
      varX += diffX * diffX;
      varY += diffY * diffY;
    }

    // 计算皮尔逊相关系数
    const denominator = Math.sqrt(varX * varY);

    if (denominator === 0) {
      return 0; // 避免除零错误
    }

    return covXY / denominator;
  }

  // 生成策略建议
  private static generateStrategySuggestions(
    positions: PositionAsset[],
    portfolio: Portfolio,
  ): string[] {
    const suggestions: string[] = [];

    // 如果没有投资组合信息或总价值为0，返回空数组
    if (!portfolio || portfolio.totalValue <= 0) {
      return suggestions;
    }

    // 集中度建议 - 使用基于整个账户总价值的权重
    if (positions.length > 0) {
      const maxPosition = positions.reduce((max, pos) => {
        const posWeight = (pos.marketValue / portfolio.totalValue) * 100;
        const maxWeight = (max.marketValue / portfolio.totalValue) * 100;
        return posWeight > maxWeight ? pos : max;
      }, positions[0]);

      const maxWeight = (maxPosition.marketValue / portfolio.totalValue) * 100;
      if (maxWeight > (portfolio.riskMode === 'retail' ? 10 : 5)) {
        suggestions.push(`建议降低${maxPosition.symbol}的持仓比例以分散风险`);
      }
    }

    // 资产配置建议
    const categoryMarketValues: Record<string, number> = {};

    // 计算各类别资产的总市值
    positions.forEach((position) => {
      const sector = position.sector || 'stock';
      categoryMarketValues[sector] = (categoryMarketValues[sector] || 0) + position.marketValue;
    });

    // 检查金融股配置
    const financialStockValue = categoryMarketValues['金融股'] || 0;
    const financialStockWeight = (financialStockValue / portfolio.totalValue) * 100;
    if (financialStockWeight < 10) {
      suggestions.push('考虑增加金融板块的投资以优化资产配置');
    }

    // 现金配置建议
    if (portfolio.cashValue > 0) {
      const cashWeight = (portfolio.cashValue / portfolio.totalValue) * 100;
      if (cashWeight > 30) {
        suggestions.push(`现金占比过高(${cashWeight.toFixed(1)}%)，可考虑增加股票投资`);
      } else if (cashWeight < 5) {
        suggestions.push(`现金储备不足(${cashWeight.toFixed(1)}%)，建议保持适当现金比例`);
      }
    }

    return suggestions;
  }
}
