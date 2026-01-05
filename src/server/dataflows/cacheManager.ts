/**
 * 股票数据缓存管理器
 * 支持本地缓存股票数据，减少API调用，提高响应速度
 */

import path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { getProjectRoot } from '@server/base/env';
import type { Logger } from '@server/base/logger';

interface CacheConfig {
  ttl_hours: number;
  max_files: number;
  description: string;
}

interface ContentLengthConfig {
  max_content_length: number;
  long_text_providers: string[];
  enable_length_check: boolean;
}

interface Metadata {
  symbol: string;
  data_type: string;
  market_type: string;
  start_date?: string;
  end_date?: string;
  data_source: string | null;
  file_path: string;
  file_format: string;
  content_length: number;
  cached_at: string;
}

class StockDataCache {
  private cache_dir: string;
  private us_stock_dir: string;
  private us_news_dir: string;
  private us_fundamentals_dir: string;
  private metadata_dir: string;
  private cache_config: { [key: string]: CacheConfig };
  private content_length_config: ContentLengthConfig;
  private logger: Logger;

  constructor({ cache_dir, logger }: { cache_dir?: string; logger: Logger }) {
    if (!cache_dir) {
      // 获取当前文件所在目录
      const current_dir = getProjectRoot();
      cache_dir = path.join(current_dir, 'data_cache');
    }

    this.logger = logger;
    this.cache_dir = path.resolve(cache_dir);
    this._createDirectory(this.cache_dir);

    // 创建子目录 - 按市场分类
    this.us_stock_dir = path.join(this.cache_dir, 'us_stocks');
    this.us_news_dir = path.join(this.cache_dir, 'us_news');
    this.us_fundamentals_dir = path.join(this.cache_dir, 'us_fundamentals');
    this.metadata_dir = path.join(this.cache_dir, 'metadata');

    // 创建所有目录
    [this.us_stock_dir, this.us_news_dir, this.us_fundamentals_dir, this.metadata_dir].forEach(
      (dir) => this._createDirectory(dir),
    );

    // 缓存配置 - 针对不同市场设置不同的TTL
    this.cache_config = {
      us_stock_data: {
        ttl_hours: 2, // 美股数据缓存2小时（考虑到API限制）
        max_files: 1000,
        description: '美股历史数据',
      },
    };

    // 内容长度限制配置（文件缓存默认不限制）
    this.content_length_config = {
      max_content_length: parseInt(process.env.MAX_CACHE_CONTENT_LENGTH || '50000'), // 50K字符
      long_text_providers: ['dashscope', 'openai', 'google'], // 支持长文本的提供商
      enable_length_check:
        (process.env.ENABLE_CACHE_LENGTH_CHECK || 'false').toLowerCase() === 'true', // 文件缓存默认不限制
    };

    this.logger.info(`📁 缓存管理器初始化完成，缓存目录: ${this.cache_dir}`);
    this.logger.info('🗄️ 数据库缓存管理器初始化完成');
    this.logger.info('   美股数据: ✅ 已配置');
    this.logger.info('   A股数据: ✅ 已配置');
  }

  private _createDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private _determineMarketType(symbol: string): string {
    // 判断是否为中国A股（6位数字）
    if (/^\d{6}$/.test(symbol)) {
      return 'china';
    } else {
      return 'us';
    }
  }

  private _checkProviderAvailability(): string[] {
    const available_providers: string[] = [];
    return available_providers;
  }

  public shouldSkipCacheForContent(content: string, data_type: string = 'unknown'): boolean {
    // 如果未启用长度检查，直接返回false
    if (!this.content_length_config.enable_length_check) {
      return false;
    }

    // 检查内容长度
    const content_length = content.length;
    const max_length = this.content_length_config.max_content_length;

    if (content_length <= max_length) {
      return false;
    }

    // 内容超长，检查是否有可用的长文本处理提供商
    const available_providers = this._checkProviderAvailability();
    const long_text_providers = this.content_length_config.long_text_providers;

    // 找到可用的长文本提供商
    const available_long_providers = available_providers.filter((p) =>
      long_text_providers.includes(p),
    );

    if (available_long_providers.length === 0) {
      this.logger.warn(
        `⚠️ 内容过长(${content_length.toLocaleString()}字符 > ${max_length.toLocaleString()}字符)且无可用长文本提供商，跳过${data_type}缓存`,
      );
      this.logger.info(`💡 可用提供商: ${available_providers}`);
      this.logger.info(`💡 长文本提供商: ${long_text_providers}`);
      return true;
    } else {
      this.logger.info(
        `✅ 内容较长(${content_length.toLocaleString()}字符)但有可用长文本提供商(${available_long_providers})，继续缓存`,
      );
      return false;
    }
  }

  private _generateCacheKey(
    data_type: string,
    symbol: string,
    kwargs: { [key: string]: unknown },
  ): string {
    // 创建一个包含所有参数的字符串
    let params_str = `${data_type}_${symbol}`;
    Object.keys(kwargs)
      .sort()
      .forEach((key) => {
        params_str += `_${key}_${kwargs[key]}`;
      });

    // 使用MD5生成短的唯一标识
    const hash = crypto.createHash('md5').update(params_str).digest('hex');
    const cache_key = hash.substring(0, 12);
    return `${symbol}_${data_type}_${cache_key}`;
  }

  private _getCachePath(
    data_type: string,
    cache_key: string,
    file_format: string = 'json',
    symbol: string | null = null,
  ): string {
    let market_type: string;
    if (symbol) {
      market_type = this._determineMarketType(symbol);
    } else {
      // 从缓存键中尝试提取市场类型
      market_type = /^[0-9]/.test(cache_key) ? 'china' : 'us';
    }

    // 根据数据类型和市场类型选择目录
    let base_dir: string;
    switch (data_type) {
      case 'stock_data':
        base_dir = this.us_stock_dir;
        break;
      case 'news':
        base_dir = this.us_news_dir;
        break;
      case 'fundamentals':
        base_dir = this.us_fundamentals_dir;
        break;
      default:
        base_dir = this.cache_dir;
    }

    return path.join(base_dir, `${cache_key}.${file_format}`);
  }

  private _getMetadataPath(cache_key: string): string {
    return path.join(this.metadata_dir, `${cache_key}_meta.json`);
  }

  private _saveMetadata(cache_key: string, metadata: Metadata): void {
    const metadata_path = this._getMetadataPath(cache_key);
    // 确保目录存在
    this._createDirectory(path.dirname(metadata_path));
    metadata.cached_at = new Date().toISOString();

    fs.writeFileSync(metadata_path, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  private _loadMetadata(cache_key: string): Metadata | null {
    const metadata_path = this._getMetadataPath(cache_key);
    if (!fs.existsSync(metadata_path)) {
      return null;
    }

    try {
      const data = fs.readFileSync(metadata_path, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      this.logger.error(`⚠️ 加载元数据失败: ${e}`);
      return null;
    }
  }

  public isCacheValid(
    cache_key: string,
    max_age_hours: number | null = null,
    symbol: string | null = null,
    data_type: string | null = null,
  ): boolean {
    const metadata = this._loadMetadata(cache_key);
    if (!metadata) {
      return false;
    }

    // 如果没有指定TTL，根据数据类型和市场自动确定
    if (max_age_hours === null) {
      if (symbol && data_type) {
        const market_type = this._determineMarketType(symbol);
        const cache_type = `${market_type}_${data_type}`;
        max_age_hours = this.cache_config[cache_type]?.ttl_hours || 24;
      } else {
        // 从元数据中获取信息
        symbol = metadata.symbol || '';
        data_type = metadata.data_type || 'stock_data';
        const market_type = this._determineMarketType(symbol);
        const cache_type = `${market_type}_${data_type}`;
        max_age_hours = this.cache_config[cache_type]?.ttl_hours || 24;
      }
    }

    const cached_at = new Date(metadata.cached_at);
    const age = (new Date().getTime() - cached_at.getTime()) / 1000; // in seconds

    const is_valid = age < max_age_hours * 3600;

    if (is_valid) {
      const market_type = this._determineMarketType(metadata.symbol || '');
      const cache_type = `${market_type}_${metadata.data_type || 'stock_data'}`;
      const desc = this.cache_config[cache_type]?.description || '数据';
      const remaining_hours = max_age_hours - age / 3600;
      this.logger.info(
        `✅ 缓存有效: ${desc} - ${metadata.symbol} (剩余 ${remaining_hours.toFixed(1)}h)`,
      );
    }

    return is_valid;
  }

  public saveStockData({
    symbol,
    data,
    start_date,
    end_date,
    data_source = null,
  }: {
    symbol: string;
    data: string;
    start_date?: string | null;
    end_date?: string | null;
    data_source?: string | null;
  }): string {
    // 检查内容长度是否需要跳过缓存
    const content_to_check = data;
    if (this.shouldSkipCacheForContent(content_to_check, '股票数据')) {
      // 生成一个虚拟的缓存键，但不实际保存
      const market_type = this._determineMarketType(symbol);
      const cache_key = this._generateCacheKey('stock_data', symbol, {
        start_date: start_date,
        end_date: end_date,
        source: data_source,
        market: market_type,
        skipped: true,
      });
      this.logger.info(`🚫 股票数据因内容过长被跳过缓存: ${symbol} -> ${cache_key}`);
      return cache_key;
    }

    const market_type = this._determineMarketType(symbol);
    const cache_key = this._generateCacheKey('stock_data', symbol, {
      start_date: start_date,
      end_date: end_date,
      source: data_source,
      market: market_type,
    });

    // 保存数据
    const cache_path = this._getCachePath('stock_data', cache_key, 'txt', symbol);
    // 确保目录存在
    this._createDirectory(path.dirname(cache_path));
    fs.writeFileSync(cache_path, data, 'utf-8');

    // 保存元数据
    const metadata: Metadata = {
      symbol: symbol,
      data_type: 'stock_data',
      market_type: market_type,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      data_source: data_source,
      file_path: cache_path,
      file_format: 'txt',
      content_length: content_to_check.length,
      cached_at: new Date().toISOString(),
    };
    this._saveMetadata(cache_key, metadata);

    // 获取描述信息
    const cache_type = `${market_type}_stock_data`;
    const desc = this.cache_config[cache_type]?.description || '股票数据';
    this.logger.info(`💾 ${desc}已缓存: ${symbol} (${data_source}) -> ${cache_key}`);
    return cache_key;
  }

  public loadStockData(cache_key: string): string | null {
    const metadata = this._loadMetadata(cache_key);
    if (!metadata) {
      return null;
    }

    const cache_path = metadata.file_path;
    if (!fs.existsSync(cache_path)) {
      return null;
    }

    try {
      return fs.readFileSync(cache_path, 'utf-8');
    } catch (e) {
      this.logger.error(`⚠️ 加载缓存数据失败: ${e}`);
      return null;
    }
  }

  public findCachedStockData({
    symbol,
    start_date,
    end_date,
    data_source,
    max_age_hours,
  }: {
    symbol: string;
    start_date: string | null;
    end_date: string | null;
    data_source: string | null;
    max_age_hours?: number | null;
  }): string | null {
    const market_type = this._determineMarketType(symbol);

    // 如果没有指定TTL，使用智能配置
    if (max_age_hours === null) {
      const cache_type = `${market_type}_stock_data`;
      max_age_hours = this.cache_config[cache_type]?.ttl_hours || 24;
    }

    // 生成查找键
    const search_key = this._generateCacheKey('stock_data', symbol, {
      start_date: start_date,
      end_date: end_date,
      source: data_source,
      market: market_type,
    });

    // 检查精确匹配
    if (this.isCacheValid(search_key, max_age_hours, symbol, 'stock_data')) {
      const cache_type = `${market_type}_stock_data`;
      const desc = this.cache_config[cache_type]?.description || '数据';
      this.logger.info(`🎯 找到精确匹配的${desc}: ${symbol} -> ${search_key}`);
      return search_key;
    }

    // 如果没有精确匹配，查找部分匹配（相同股票代码的其他缓存）
    const metadata_files = fs
      .readdirSync(this.metadata_dir)
      .filter((file) => file.endsWith('_meta.json'))
      .map((file) => path.join(this.metadata_dir, file));

    for (const metadata_file of metadata_files) {
      try {
        const metadata_content = fs.readFileSync(metadata_file, 'utf-8');
        const metadata = JSON.parse(metadata_content);

        if (
          metadata.symbol === symbol &&
          metadata.data_type === 'stock_data' &&
          metadata.market_type === market_type &&
          (data_source === null || metadata.data_source === data_source)
        ) {
          const cache_key = path.basename(metadata_file, '_meta.json');
          if (this.isCacheValid(cache_key, max_age_hours, symbol, 'stock_data')) {
            const cache_type = `${market_type}_stock_data`;
            const desc = this.cache_config[cache_type]?.description || '数据';
            this.logger.info(`📋 找到部分匹配的${desc}: ${symbol} -> ${cache_key}`);
            return cache_key;
          }
        }
      } catch (e) {
        continue;
      }
    }

    const cache_type = `${market_type}_stock_data`;
    const desc = this.cache_config[cache_type]?.description || '数据';
    this.logger.error(`❌ 未找到有效的${desc}缓存: ${symbol}`);
    return null;
  }

  public saveNewsData(
    symbol: string,
    news_data: string,
    start_date: string | null = null,
    end_date: string | null = null,
    data_source: string = 'unknown',
  ): string {
    // 检查内容长度是否需要跳过缓存
    if (this.shouldSkipCacheForContent(news_data, '新闻数据')) {
      // 生成一个虚拟的缓存键，但不实际保存
      const cache_key = this._generateCacheKey('news', symbol, {
        start_date: start_date,
        end_date: end_date,
        source: data_source,
        skipped: true,
      });
      this.logger.info(`🚫 新闻数据因内容过长被跳过缓存: ${symbol} -> ${cache_key}`);
      return cache_key;
    }

    const cache_key = this._generateCacheKey('news', symbol, {
      start_date: start_date,
      end_date: end_date,
      source: data_source,
    });

    const cache_path = this._getCachePath('news', cache_key, 'txt');
    // 确保目录存在
    this._createDirectory(path.dirname(cache_path));
    fs.writeFileSync(cache_path, news_data, 'utf-8');

    const metadata: Metadata = {
      symbol: symbol,
      data_type: 'news',
      market_type: this._determineMarketType(symbol),
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      data_source: data_source,
      file_path: cache_path,
      file_format: 'txt',
      content_length: news_data.length,
      cached_at: new Date().toISOString(),
    };
    this._saveMetadata(cache_key, metadata);

    this.logger.info(`📰 新闻数据已缓存: ${symbol} (${data_source}) -> ${cache_key}`);
    return cache_key;
  }

  public saveFundamentalsData(
    symbol: string,
    fundamentals_data: string,
    data_source: string = 'unknown',
  ): string {
    // 检查内容长度是否需要跳过缓存
    if (this.shouldSkipCacheForContent(fundamentals_data, '基本面数据')) {
      // 生成一个虚拟的缓存键，但不实际保存
      const market_type = this._determineMarketType(symbol);
      const cache_key = this._generateCacheKey('fundamentals', symbol, {
        source: data_source,
        market: market_type,
        date: new Date().toISOString().split('T')[0],
        skipped: true,
      });
      this.logger.info(`🚫 基本面数据因内容过长被跳过缓存: ${symbol} -> ${cache_key}`);
      return cache_key;
    }

    const market_type = this._determineMarketType(symbol);
    const cache_key = this._generateCacheKey('fundamentals', symbol, {
      source: data_source,
      market: market_type,
      date: new Date().toISOString().split('T')[0],
    });

    const cache_path = this._getCachePath('fundamentals', cache_key, 'txt', symbol);
    // 确保目录存在
    this._createDirectory(path.dirname(cache_path));
    fs.writeFileSync(cache_path, fundamentals_data, 'utf-8');

    const metadata: Metadata = {
      symbol: symbol,
      data_type: 'fundamentals',
      market_type: market_type,
      data_source: data_source,
      file_path: cache_path,
      file_format: 'txt',
      content_length: fundamentals_data.length,
      cached_at: new Date().toISOString(),
    };
    this._saveMetadata(cache_key, metadata);

    const cache_type = `${market_type}_fundamentals`;
    const desc = this.cache_config[cache_type]?.description || '基本面数据';
    this.logger.info(`💼 ${desc}已缓存: ${symbol} (${data_source}) -> ${cache_key}`);
    return cache_key;
  }

  public loadFundamentalsData(cache_key: string): string | null {
    const metadata = this._loadMetadata(cache_key);
    if (!metadata) {
      return null;
    }

    const cache_path = metadata.file_path;
    if (!fs.existsSync(cache_path)) {
      return null;
    }

    try {
      return fs.readFileSync(cache_path, 'utf-8');
    } catch (e) {
      this.logger.error(`⚠️ 加载基本面缓存数据失败: ${e}`);
      return null;
    }
  }

  public findCachedFundamentalsData(
    symbol: string,
    data_source: string | null = null,
    max_age_hours: number | null = null,
  ): string | null {
    const market_type = this._determineMarketType(symbol);

    // 如果没有指定TTL，使用智能配置
    if (max_age_hours === null) {
      const cache_type = `${market_type}_fundamentals`;
      max_age_hours = this.cache_config[cache_type]?.ttl_hours || 24;
    }

    // 查找匹配的缓存
    const metadata_files = fs
      .readdirSync(this.metadata_dir)
      .filter((file) => file.endsWith('_meta.json'))
      .map((file) => path.join(this.metadata_dir, file));

    for (const metadata_file of metadata_files) {
      try {
        const metadata_content = fs.readFileSync(metadata_file, 'utf-8');
        const metadata = JSON.parse(metadata_content);

        if (
          metadata.symbol === symbol &&
          metadata.data_type === 'fundamentals' &&
          metadata.market_type === market_type &&
          (data_source === null || metadata.data_source === data_source)
        ) {
          const cache_key = path.basename(metadata_file, '_meta.json');
          if (this.isCacheValid(cache_key, max_age_hours, symbol, 'fundamentals')) {
            const cache_type = `${market_type}_fundamentals`;
            const desc = this.cache_config[cache_type]?.description || '基本面数据';
            this.logger.info(
              `🎯 找到匹配的${desc}缓存: ${symbol} (${data_source}) -> ${cache_key}`,
            );
            return cache_key;
          }
        }
      } catch (e) {
        continue;
      }
    }

    const cache_type = `${market_type}_fundamentals`;
    const desc = this.cache_config[cache_type]?.description || '基本面数据';
    this.logger.error(`❌ 未找到有效的${desc}缓存: ${symbol} (${data_source})`);
    return null;
  }

  public clearOldCache(max_age_days: number = 7): void {
    const cutoff_time = new Date();
    cutoff_time.setDate(cutoff_time.getDate() - max_age_days);
    let cleared_count = 0;

    const metadata_files = fs
      .readdirSync(this.metadata_dir)
      .filter((file) => file.endsWith('_meta.json'))
      .map((file) => path.join(this.metadata_dir, file));

    for (const metadata_file of metadata_files) {
      try {
        const metadata_content = fs.readFileSync(metadata_file, 'utf-8');
        const metadata = JSON.parse(metadata_content);

        const cached_at = new Date(metadata.cached_at);
        if (cached_at < cutoff_time) {
          // 删除数据文件
          const data_file = metadata.file_path;
          if (fs.existsSync(data_file)) {
            fs.unlinkSync(data_file);
          }

          // 删除元数据文件
          fs.unlinkSync(metadata_file);
          cleared_count++;
        }
      } catch (e) {
        this.logger.warn(`⚠️ 清理缓存时出错: ${e}`);
      }
    }

    this.logger.info(`🧹 已清理 ${cleared_count} 个过期缓存文件`);
  }

  public getCacheStats(): { [key: string]: unknown } {
    const stats: { [key: string]: number } = {
      total_files: 0,
      stock_data_count: 0,
      news_count: 0,
      fundamentals_count: 0,
      total_size_mb: 0,
      skipped_count: 0, // 新增：跳过的缓存数量
    };

    const metadata_files = fs
      .readdirSync(this.metadata_dir)
      .filter((file) => file.endsWith('_meta.json'))
      .map((file) => path.join(this.metadata_dir, file));

    for (const metadata_file of metadata_files) {
      try {
        const metadata_content = fs.readFileSync(metadata_file, 'utf-8');
        const metadata = JSON.parse(metadata_content);

        const data_type = metadata.data_type || 'unknown';
        if (data_type === 'stock_data') {
          stats.stock_data_count++;
        } else if (data_type === 'news') {
          stats.news_count++;
        } else if (data_type === 'fundamentals') {
          stats.fundamentals_count++;
        }

        // 检查是否为跳过的缓存（没有实际文件）
        const data_file = metadata.file_path;
        if (!fs.existsSync(data_file)) {
          stats.skipped_count++;
        } else {
          // 计算文件大小
          const stat = fs.statSync(data_file);
          stats.total_size_mb += stat.size / (1024 * 1024);
        }

        stats.total_files++;
      } catch (e) {
        continue;
      }
    }

    stats.total_size_mb = Math.round(stats.total_size_mb * 100) / 100;
    return stats;
  }

  public getContentLengthConfigStatus() {
    const available_providers = this._checkProviderAvailability();
    const long_text_providers = this.content_length_config.long_text_providers;
    const available_long_providers = available_providers.filter((p) =>
      long_text_providers.includes(p),
    );

    return {
      enabled: this.content_length_config.enable_length_check,
      max_content_length: this.content_length_config.max_content_length,
      max_content_length_formatted: `${this.content_length_config.max_content_length.toLocaleString()}字符`,
      long_text_providers: long_text_providers,
      available_providers: available_providers,
      available_long_providers: available_long_providers,
      has_long_text_support: available_long_providers.length > 0,
      will_skip_long_content:
        this.content_length_config.enable_length_check && available_long_providers.length === 0,
    };
  }
}

// 全局缓存实例
let _cache_instance: StockDataCache | null = null;

function getCache(logger: Logger): StockDataCache {
  if (_cache_instance === null) {
    _cache_instance = new StockDataCache({
      logger: logger,
    });
  }
  return _cache_instance;
}

export { StockDataCache, getCache };
