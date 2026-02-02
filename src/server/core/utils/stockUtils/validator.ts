/**
 * 股票数据预获取和验证模块
 * 用于在分析流程开始前验证股票是否存在，并预先获取和缓存必要的数据
 */

import type { Logger } from '@server/base/logger';
import { getStockData } from '@server/service/stockDataService';
import dayjs from 'dayjs';
import type { MarketType as AssetMarketType } from '@typings/asset';

// 定义市场类型常量
const MarketTypeConstant = {
  CHINA_A: 'A股',
  HONG_KONG: '港股',
  US: '美股',
  AUTO: 'auto',
  UNKNOWN: '未知',
} as const;

type ValidatorMarketType = (typeof MarketTypeConstant)[keyof typeof MarketTypeConstant];

// 定义数据准备结果类
export class StockDataPreparationResult {
  is_valid: boolean;
  stock_code: string;
  market_type: string;
  stock_name: string;
  error_message: string;
  suggestion: string;
  has_historical_data: boolean;
  has_basic_info: boolean;
  data_period_days: number;
  cache_status: string;

  constructor({
    is_valid,
    stock_code,
    market_type = '',
    stock_name = '',
    error_message = '',
    suggestion = '',
    has_historical_data = false,
    has_basic_info = false,
    data_period_days = 0,
    cache_status = '',
  }: {
    is_valid: boolean;
    stock_code: string;
    market_type: string;
    stock_name: string;
    error_message?: string;
    suggestion?: string;
    has_historical_data?: boolean;
    has_basic_info?: boolean;
    data_period_days?: number;
    cache_status?: string;
  }) {
    this.is_valid = is_valid;
    this.stock_code = stock_code;
    this.market_type = market_type;
    this.stock_name = stock_name;
    this.error_message = error_message;
    this.suggestion = suggestion;
    this.has_historical_data = has_historical_data;
    this.has_basic_info = has_basic_info;
    this.data_period_days = data_period_days;
    this.cache_status = cache_status;
  }

  toDict(): Record<string, unknown> {
    return {
      is_valid: this.is_valid,
      stock_code: this.stock_code,
      market_type: this.market_type,
      stock_name: this.stock_name,
      error_message: this.error_message,
      suggestion: this.suggestion,
      has_historical_data: this.has_historical_data,
      has_basic_info: this.has_basic_info,
      data_period_days: this.data_period_days,
      cache_status: this.cache_status,
    };
  }
}

// 保持向后兼容
export type StockValidationResult = StockDataPreparationResult;

// 股票数据预获取和验证器类
export class StockDataPreparer {
  private defaultPeriodDays: number;
  logger: Logger;

  constructor(defaultPeriodDays: number = 30, logger: Logger) {
    this.defaultPeriodDays = defaultPeriodDays; // 默认历史数据时长（天）
    this.logger = logger;
  }

  /**
   * 预获取和验证股票数据
   * @param stockCode 股票代码
   * @param marketType 市场类型 ("A股", "港股", "美股", "auto")
   * @param periodDays 历史数据时长（天），默认使用类初始化时的值
   * @param analysisDate 分析日期，默认为今天
   * @returns 数据准备结果
   */
  async prepareStockData(
    stockCode: string,
    marketType: string = 'auto',
    periodDays: number | null = null,
    analysisDate: string | null = null,
  ): Promise<StockDataPreparationResult> {
    if (periodDays === null) {
      periodDays = this.defaultPeriodDays;
    }

    if (analysisDate === null) {
      analysisDate = new Date().toISOString().split('T')[0];
    }

    this.logger.info(
      `📊 [数据准备] 开始准备股票数据: ${stockCode} (市场: ${marketType}, 时长: ${periodDays}天)`,
    );

    // 1. 基本格式验证
    const formatResult = this.validateFormat(stockCode, marketType);
    if (!formatResult.is_valid) {
      return formatResult;
    }

    // 2. 自动检测市场类型
    if (marketType === 'auto') {
      marketType = this.detectMarketType(stockCode);
      this.logger.debug(`📊 [数据准备] 自动检测市场类型: ${marketType}`);
    }

    // 3. 预获取数据并验证
    return await this.prepareDataByMarket(stockCode, marketType, periodDays, analysisDate);
  }

  /**
   * 验证股票代码格式
   * @param stockCode 股票代码
   * @param marketType 市场类型
   * @returns 验证结果
   */
  private validateFormat(stockCode: string, marketType: string): StockDataPreparationResult {
    stockCode = stockCode.trim();

    if (!stockCode) {
      return new StockDataPreparationResult({
        is_valid: false,
        stock_code: stockCode,
        market_type: '',
        stock_name: '',
        error_message: '股票代码不能为空',
        suggestion: '请输入有效的股票代码',
      });
    }

    if (stockCode.length > 10) {
      return new StockDataPreparationResult({
        is_valid: false,
        stock_code: stockCode,
        market_type: '',
        stock_name: '',
        error_message: '股票代码长度不能超过10个字符',
        suggestion: '请检查股票代码格式',
      });
    }

    // 根据市场类型验证格式
    if (marketType === MarketTypeConstant.CHINA_A) {
      if (!/^\d{6}$/.test(stockCode)) {
        return new StockDataPreparationResult({
          is_valid: false,
          stock_code: stockCode,
          market_type: MarketTypeConstant.CHINA_A,
          stock_name: '',
          error_message: 'A股代码格式错误，应为6位数字',
          suggestion: '请输入6位数字的A股代码，如：000001、600519',
        });
      }
    } else if (marketType === MarketTypeConstant.HONG_KONG) {
      const hkFormat = /^\d{4,5}\.HK$/i.test(stockCode.toUpperCase());
      const digitFormat = /^\d{4,5}$/.test(stockCode);

      if (!(hkFormat || digitFormat)) {
        return new StockDataPreparationResult({
          is_valid: false,
          stock_code: stockCode,
          market_type: MarketTypeConstant.HONG_KONG,
          stock_name: '',
          error_message: '港股代码格式错误',
          suggestion: '请输入4-5位数字.HK格式（如：0700.HK）或4-5位数字（如：0700）',
        });
      }
    } else if (marketType === MarketTypeConstant.US) {
      if (!/^[A-Z]{1,5}$/i.test(stockCode)) {
        return new StockDataPreparationResult({
          is_valid: false,
          stock_code: stockCode,
          market_type: MarketTypeConstant.US,
          stock_name: '',
          error_message: '美股代码格式错误，应为1-5位字母',
          suggestion: '请输入1-5位字母的美股代码，如：AAPL、TSLA',
        });
      }
    }

    return new StockDataPreparationResult({
      is_valid: true,
      stock_code: stockCode,
      market_type: marketType,
      stock_name: '',
    });
  }

  /**
   * 自动检测市场类型
   * @param stockCode 股票代码
   * @returns 市场类型
   */
  private detectMarketType(stockCode: string): string {
    stockCode = stockCode.trim().toUpperCase();

    // A股：6位数字
    if (/^\d{6}$/.test(stockCode)) {
      return MarketTypeConstant.CHINA_A;
    }

    // 港股：4-5位数字.HK 或 纯4-5位数字
    if (/^\d{4,5}\.HK$/.test(stockCode) || /^\d{4,5}$/.test(stockCode)) {
      return MarketTypeConstant.HONG_KONG;
    }

    // 美股：1-5位字母
    if (/^[A-Z]{1,5}$/.test(stockCode)) {
      return MarketTypeConstant.US;
    }

    return MarketTypeConstant.UNKNOWN;
  }

  /**
   * 根据市场类型预获取数据
   * @param stockCode 股票代码
   * @param marketType 市场类型
   * @param periodDays 历史数据时长
   * @param analysisDate 分析日期
   * @returns 数据准备结果
   */
  private async prepareDataByMarket(
    stockCode: string,
    marketType: string,
    periodDays: number,
    analysisDate: string,
  ): Promise<StockDataPreparationResult> {
    this.logger.debug(`📊 [数据准备] 开始为${marketType}股票${stockCode}准备数据`);

    try {
      switch (marketType) {
        case MarketTypeConstant.CHINA_A:
          return await this.prepareChinaStockData(stockCode, periodDays, analysisDate);
        case MarketTypeConstant.HONG_KONG:
          return await this.prepareHkStockData(stockCode, periodDays, analysisDate);
        case MarketTypeConstant.US:
          return await this.prepareUsStockData(stockCode, periodDays, analysisDate);
        default:
          return new StockDataPreparationResult({
            is_valid: false,
            stock_code: stockCode,
            stock_name: '',
            market_type: marketType,
            error_message: `不支持的市场类型: ${marketType}`,
            suggestion: '请选择支持的市场类型：A股、港股、美股',
          });
      }
    } catch (error) {
      this.logger.error(`❌ [数据准备] 数据准备异常: ${error}`);
      return new StockDataPreparationResult({
        is_valid: false,
        stock_code: stockCode,
        stock_name: '',
        market_type: marketType,
        error_message: `数据准备过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
        suggestion: '请检查网络连接或稍后重试',
      });
    }
  }

  /**
   * 预获取A股数据
   * @param stockCode 股票代码
   * @param periodDays 历史数据时长
   * @param analysisDate 分析日期
   * @returns 数据准备结果
   */
  private async prepareChinaStockData(
    stockCode: string,
    periodDays: number,
    analysisDate: string,
  ): Promise<StockDataPreparationResult> {
    this.logger.info(`📊 [A股数据] 开始准备${stockCode}的数据 (时长: ${periodDays}天)`);

    // 计算日期范围
    const endDate = new Date(analysisDate);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    let hasHistoricalData = false;
    let hasBasicInfo = false;
    let stockName = '未知';
    let cacheStatus = '';

    try {
      // 1. 获取基本信息
      this.logger.debug(`📊 [A股数据] 获取${stockCode}基本信息...`);
      // 这里需要替换为实际的A股数据获取函数
      // const stockInfo = await getChinaStockInfoUnified(stockCode);

      // 模拟数据获取
      const stockInfo = '股票名称: 中国平安\n代码: 601318\n行业: 保险';

      if (stockInfo && !stockInfo.includes('❌') && !stockInfo.includes('未能获取')) {
        // 解析股票名称
        if (stockInfo.includes('股票名称:')) {
          const lines = stockInfo.split('\n');
          for (const line of lines) {
            if (line.includes('股票名称:')) {
              stockName = line.split(':')[1].trim();
              break;
            }
          }
        }

        // 检查是否为有效的股票名称
        if (stockName !== '未知' && !stockName.startsWith(`股票${stockCode}`)) {
          hasBasicInfo = true;
          this.logger.info(`✅ [A股数据] 基本信息获取成功: ${stockCode} - ${stockName}`);
          cacheStatus += '基本信息已缓存; ';
        } else {
          this.logger.warn(`⚠️ [A股数据] 基本信息无效: ${stockCode}`);
          return new StockDataPreparationResult({
            is_valid: false,
            stock_code: stockCode,
            stock_name: '',
            market_type: MarketTypeConstant.CHINA_A,
            error_message: `股票代码 ${stockCode} 不存在或信息无效`,
            suggestion: '请检查股票代码是否正确，或确认该股票是否已上市',
          });
        }
      } else {
        this.logger.warn(`⚠️ [A股数据] 无法获取基本信息: ${stockCode}`);
        return new StockDataPreparationResult({
          is_valid: false,
          stock_code: stockCode,
          stock_name: '',
          market_type: MarketTypeConstant.CHINA_A,
          error_message: `无法获取股票 ${stockCode} 的基本信息`,
          suggestion: '请检查股票代码是否正确，或确认该股票是否已上市',
        });
      }

      // 2. 获取历史数据
      this.logger.debug(
        `📊 [A股数据] 获取${stockCode}历史数据 (${startDateStr} 到 ${endDateStr})...`,
      );
      // 这里需要替换为实际的A股历史数据获取函数
      // const historicalData = await getChinaStockDataUnified(stockCode, startDateStr, endDateStr);

      // 模拟历史数据获取
      const historicalData =
        '日期,开盘价,收盘价,最高价,最低价,成交量\n2023-01-01,50.0,51.0,52.0,49.0,1000000';

      if (
        historicalData &&
        !historicalData.includes('❌') &&
        !historicalData.includes('获取失败')
      ) {
        // 更宽松的数据有效性检查
        const dataIndicators = [
          '开盘价',
          '收盘价',
          '最高价',
          '最低价',
          '成交量',
          'open',
          'close',
          'high',
          'low',
          'volume',
          '日期',
          'date',
          '时间',
          'time',
        ];

        const hasValidData =
          historicalData.length > 50 &&
          dataIndicators.some((indicator) => historicalData.includes(indicator));

        if (hasValidData) {
          hasHistoricalData = true;
          this.logger.info(`✅ [A股数据] 历史数据获取成功: ${stockCode} (${periodDays}天)`);
          cacheStatus += `历史数据已缓存(${periodDays}天); `;
        } else {
          this.logger.warn(`⚠️ [A股数据] 历史数据无效: ${stockCode}`);
          this.logger.debug(`🔍 [A股数据] 数据内容预览: ${historicalData.substring(0, 200)}...`);
          return new StockDataPreparationResult({
            is_valid: false,
            stock_code: stockCode,
            market_type: MarketTypeConstant.CHINA_A,
            stock_name: stockName,
            error_message: `股票 ${stockCode} 的历史数据无效或不足`,
            suggestion: '该股票可能为新上市股票或数据源暂时不可用，请稍后重试',
            has_historical_data: false,
            has_basic_info: hasBasicInfo,
          });
        }
      } else {
        this.logger.warn(`⚠️ [A股数据] 无法获取历史数据: ${stockCode}`);
        return new StockDataPreparationResult({
          is_valid: false,
          stock_code: stockCode,
          market_type: MarketTypeConstant.CHINA_A,
          stock_name: stockName,
          error_message: `无法获取股票 ${stockCode} 的历史数据`,
          suggestion: '请检查网络连接或数据源配置，或稍后重试',
          has_historical_data: false,
          has_basic_info: hasBasicInfo,
        });
      }

      // 3. 数据准备成功
      this.logger.info(`🎉 [A股数据] 数据准备完成: ${stockCode} - ${stockName}`);
      return new StockDataPreparationResult({
        is_valid: false,
        stock_code: stockCode,
        market_type: MarketTypeConstant.CHINA_A,
        stock_name: stockName,
        error_message: '',
        suggestion: '',
        has_historical_data: hasHistoricalData,
        has_basic_info: hasBasicInfo,
        data_period_days: periodDays,
        cache_status: cacheStatus.replace(/; $/, ''),
      });
    } catch (error) {
      this.logger.error(`❌ [A股数据] 数据准备失败: ${error}`);
      return new StockDataPreparationResult({
        is_valid: false,
        stock_code: stockCode,
        market_type: MarketTypeConstant.CHINA_A,
        stock_name: stockName,
        error_message: `数据准备失败: ${error instanceof Error ? error.message : String(error)}`,
        suggestion: '请检查网络连接或数据源配置',
        has_historical_data: hasHistoricalData,
        has_basic_info: hasBasicInfo,
      });
    }
  }

  // 注意：为了简洁起见，这里只实现了A股数据准备方法
  // 港股和美股的方法需要按照类似的方式实现
  private async prepareHkStockData(
    stockCode: string,
    periodDays: number,
    analysisDate: string,
  ): Promise<StockDataPreparationResult> {
    console.log('prepareHkStockData', stockCode, periodDays, analysisDate);
    // 实现港股数据准备逻辑
    // 这里需要根据实际需求实现
    return new StockDataPreparationResult({
      is_valid: false,
      stock_code: stockCode,
      market_type: MarketTypeConstant.HONG_KONG,
      stock_name: '',
      error_message: '港股数据准备功能尚未实现',
      suggestion: '请实现港股数据准备逻辑',
    });
  }

  private async prepareUsStockData(
    stockCode: string,
    periodDays: number,
    analysisDate: string,
  ): Promise<StockDataPreparationResult> {
    // 实现美股数据准备逻辑
    this.logger.info(`📊 [美股数据] 开始准备${stockCode}的数据 (时长: ${periodDays}天)`);

    const formatted_code = stockCode.toUpperCase();

    const endDate = dayjs(analysisDate, 'YYYY-MM-DD');
    const startDate = endDate.subtract(periodDays, 'day');
    const startDateStr = startDate.format('YYYY-MM-DD');
    const endDateStr = endDate.format('YYYY-MM-DD');

    let has_historical_data = false;
    let has_basic_info = false;
    const stock_name = stockCode; // 美股通常使用代码作为名称
    let cache_status = '';

    try {
      const historical_data = await getStockData(
        formatted_code,
        startDateStr,
        endDateStr,
        'US' as AssetMarketType,
        this.logger,
      );

      if (historical_data) {
        const dataIndicators = [
          '开盘价',
          '收盘价',
          '最高价',
          '最低价',
          '成交量',
          'Open',
          'Close',
          'High',
          'Low',
          'Volume',
          '日期',
          'Date',
          '时间',
          'Time',
        ];
        const has_valid_data =
          historical_data.length > 50 &&
          dataIndicators.some((indicator) => historical_data.includes(indicator));
        if (has_valid_data) {
          has_historical_data = true;
          has_basic_info = true;
          this.logger.info(`✅ [美股数据] 历史数据获取成功: ${formatted_code} (${periodDays}天)`);
          cache_status = `历史数据已缓存(${periodDays}天)`;
          return new StockDataPreparationResult({
            is_valid: true,
            stock_code: formatted_code,
            market_type: MarketTypeConstant.US,
            stock_name,
            has_historical_data,
            has_basic_info,
            data_period_days: periodDays,
            cache_status: cache_status,
          });
        } else {
          this.logger.warn(`⚠️ [美股数据] 历史数据无效: ${formatted_code}`);
          this.logger.debug(`🔍 [美股数据] 数据内容预览: ${historical_data.substring(0, 200)}...`);
          return new StockDataPreparationResult({
            is_valid: false,
            stock_code: formatted_code,
            market_type: MarketTypeConstant.US,
            stock_name: '',
            error_message: `美股 ${formatted_code} 的历史数据无效或不足`,
            suggestion: '该股票可能为新上市股票或数据源暂时不可用，请稍后重试',
          });
        }
      } else {
        this.logger.warn(`⚠️ [美股数据] 无法获取历史数据: ${formatted_code}`);
        return new StockDataPreparationResult({
          is_valid: false,
          stock_code: formatted_code,
          market_type: MarketTypeConstant.US,
          stock_name,
          error_message: `美股代码 ${formatted_code} 不存在或无法获取数据`,
          suggestion: '请检查美股代码是否正确，如：AAPL、TSLA、MSFT',
        });
      }
    } catch (error) {
      this.logger.error(`❌ [美股数据] 数据准备失败: ${String(error)}`);
      return new StockDataPreparationResult({
        is_valid: false,
        stock_code: stockCode,
        market_type: MarketTypeConstant.US,
        stock_name: '',
        error_message: '美股数据准备功能失败',
        suggestion: '请实现美股数据准备逻辑',
      });
    }
  }
}

// 全局数据准备器实例管理
let _stockPreparer: StockDataPreparer | null = null;

export function getStockPreparer(
  defaultPeriodDays: number = 30,
  logger: Logger,
): StockDataPreparer {
  if (_stockPreparer === null) {
    _stockPreparer = new StockDataPreparer(defaultPeriodDays, logger);
  }
  return _stockPreparer;
}

/**
 * 便捷函数：预获取和验证股票数据
 * @param stockCode 股票代码
 * @param marketType 市场类型 ("A股", "港股", "美股", "auto")
 * @param periodDays 历史数据时长（天），默认30天
 * @param analysisDate 分析日期，默认为今天
 * @returns 数据准备结果
 */
export async function prepareStockData(
  stockCode: string,
  marketType: string = 'auto',
  periodDays: number | null = null,
  analysisDate: string | null = null,
  logger: Logger,
): Promise<StockDataPreparationResult> {
  const preparer = getStockPreparer(30, logger);
  return await preparer.prepareStockData(stockCode, marketType, periodDays, analysisDate);
}
